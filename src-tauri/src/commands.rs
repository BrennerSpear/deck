use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

// ── Types ──────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_file: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<DirEntry>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectConfig {
    pub id: String,
    pub name: String,
    pub path: String,
    pub icon: String,
}

// ── State ──────────────────────────────────────────────────────────────────

#[allow(dead_code)]
pub struct WatcherState {
    watchers: Mutex<HashMap<String, notify::RecommendedWatcher>>,
}

impl Default for WatcherState {
    fn default() -> Self {
        WatcherState {
            watchers: Mutex::new(HashMap::new()),
        }
    }
}

// ── Commands ───────────────────────────────────────────────────────────────

/// List directory contents recursively up to a specified depth
#[tauri::command]
pub fn list_dir(path: String, depth: Option<u32>) -> Result<Vec<DirEntry>, String> {
    let path = PathBuf::from(&path);
    if !path.exists() {
        return Err(format!("Path does not exist: {}", path.display()));
    }
    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", path.display()));
    }

    let max_depth = depth.unwrap_or(1);
    list_dir_recursive(&path, 0, max_depth)
}

fn list_dir_recursive(path: &PathBuf, current_depth: u32, max_depth: u32) -> Result<Vec<DirEntry>, String> {
    let mut entries = Vec::new();

    let read_dir = std::fs::read_dir(path)
        .map_err(|e| format!("Failed to read directory {}: {}", path.display(), e))?;

    for entry in read_dir {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let metadata = entry.metadata().map_err(|e| format!("Failed to get metadata: {}", e))?;
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files/dirs (starting with .) and common noise
        if name.starts_with('.') || name == "node_modules" || name == "target" || name == ".svelte-kit" || name == "__pycache__" {
            continue;
        }

        let is_dir = metadata.is_dir();
        let is_file = metadata.is_file();

        let children = if is_dir && current_depth < max_depth {
            match list_dir_recursive(&entry.path(), current_depth + 1, max_depth) {
                Ok(c) => Some(c),
                Err(_) => None,
            }
        } else {
            None
        };

        let size = if is_file { Some(metadata.len()) } else { None };

        entries.push(DirEntry {
            name,
            path: entry.path().to_string_lossy().to_string(),
            is_dir,
            is_file,
            children,
            size,
        });
    }

    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

/// Read file contents as a string
#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    let path = PathBuf::from(&path);
    if !path.exists() {
        return Err(format!("File does not exist: {}", path.display()));
    }
    if !path.is_file() {
        return Err(format!("Path is not a file: {}", path.display()));
    }

    // Check file size - refuse to read files over 1MB
    let metadata = std::fs::metadata(&path)
        .map_err(|e| format!("Failed to get metadata: {}", e))?;
    if metadata.len() > 1_048_576 {
        return Err(format!("File too large ({} bytes). Maximum is 1MB.", metadata.len()));
    }

    std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file {}: {}", path.display(), e))
}

/// Load the projects config file
#[tauri::command]
pub fn load_config(app: AppHandle) -> Result<Vec<ProjectConfig>, String> {
    let config_dir = app.path().app_config_dir()
        .map_err(|e| format!("Failed to get config dir: {}", e))?;
    let config_path = config_dir.join("projects.json");

    if !config_path.exists() {
        return Ok(Vec::new());
    }

    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config: {}", e))
}

/// Save the projects config file
#[tauri::command]
pub fn save_config(app: AppHandle, projects: Vec<ProjectConfig>) -> Result<(), String> {
    let config_dir = app.path().app_config_dir()
        .map_err(|e| format!("Failed to get config dir: {}", e))?;

    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Failed to create config dir: {}", e))?;

    let config_path = config_dir.join("projects.json");
    let content = serde_json::to_string_pretty(&projects)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    std::fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config: {}", e))
}

/// Start watching a directory for changes
#[tauri::command]
pub fn watch_dir(app: AppHandle, path: String, id: String) -> Result<(), String> {
    use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher, Event};

    let app_clone = app.clone();
    let id_clone = id.clone();

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            match res {
                Ok(event) => {
                    let paths: Vec<String> = event.paths.iter()
                        .map(|p| p.to_string_lossy().to_string())
                        .collect();
                    let _ = app_clone.emit(&format!("fs-change:{}", id_clone), serde_json::json!({
                        "kind": format!("{:?}", event.kind),
                        "paths": paths,
                    }));
                }
                Err(e) => {
                    eprintln!("Watch error: {:?}", e);
                }
            }
        },
        Config::default(),
    ).map_err(|e| format!("Failed to create watcher: {}", e))?;

    watcher.watch(std::path::Path::new(&path), RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch path: {}", e))?;

    // Store watcher to keep it alive
    // Note: In production, you'd use a managed state. For now we leak the watcher
    // to keep it alive. The app state management handles this.
    std::mem::forget(watcher);

    Ok(())
}

/// Stop watching a directory
#[tauri::command]
pub fn unwatch_dir(_id: String) -> Result<(), String> {
    // In a full implementation, we'd look up and drop the watcher from state
    // For now, this is a placeholder
    Ok(())
}

/// Open a folder picker dialog
#[tauri::command]
pub async fn pick_folder() -> Result<Option<String>, String> {
    // This uses the dialog plugin on the frontend side
    // This command is a placeholder — the actual folder picking
    // is done via @tauri-apps/plugin-dialog on the JS side
    Ok(None)
}
