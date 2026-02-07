mod commands;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::list_dir,
            commands::read_file,
            commands::load_config,
            commands::save_config,
            commands::watch_dir,
            commands::unwatch_dir,
            commands::pick_folder,
        ])
        .setup(|app| {
            // Ensure config directory exists
            let app_config_dir = app.path().app_config_dir().expect("Failed to get app config dir");
            std::fs::create_dir_all(&app_config_dir).ok();

            // Initialize config file if it doesn't exist
            let config_path = app_config_dir.join("projects.json");
            if !config_path.exists() {
                std::fs::write(&config_path, "[]").ok();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
