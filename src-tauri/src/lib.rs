pub mod embedding;
pub mod imap_client;
pub mod settings;

// For mobile
// #[cfg_attr(mobile, tauri::mobile_entry_point)]
// pub fn run() {
//     tauri::Builder::default()
//         .plugin(tauri_plugin_opener::init())
//         .run(tauri::generate_context!())
//         .expect("error while running tauri application");
// }
