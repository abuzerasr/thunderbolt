// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod libsql;
mod state;

use anyhow::Result;
use mozilla_assist_lib::{
    imap_client::{fetch_inbox_top as imap_fetch_inbox_top, Message},
    settings::get_settings,
};
use std::env;
use tauri::{command, ActivationPolicy, Manager};
use tokio::sync::Mutex;

use crate::state::AppState;

#[command]
async fn toggle_dock_icon(app_handle: tauri::AppHandle, show: bool) -> Result<(), String> {
    if cfg!(target_os = "macos") {
        let policy = if show {
            ActivationPolicy::Regular
        } else {
            ActivationPolicy::Accessory
        };

        let _ = app_handle.set_activation_policy(policy);
    }

    Ok(())
}

#[command]
async fn fetch_inbox_top(
    app_handle: tauri::AppHandle,
    count: Option<usize>,
) -> Result<Vec<Message>, String> {
    let state = app_handle.state::<Mutex<AppState>>();
    let settings = {
        let mut state = state.lock().await;
        let conn = state
            .libsql
            .as_mut()
            .ok_or_else(|| "Database not initialized".to_string())?;

        get_settings(conn)
            .await
            .map_err(|e| format!("Failed to get settings: {}", e))?
    }; // The lock is released here when state goes out of scope

    // Now make the IMAP call with the settings we retrieved
    imap_fetch_inbox_top(&settings, count).map_err(|e| format!("Failed to fetch inbox top: {}", e))
}

#[tokio::main]
async fn main() -> Result<()> {
    // This should be called as early in the execution of the app as possible
    #[cfg(debug_assertions)] // only enable instrumentation in development builds
    let devtools = tauri_plugin_devtools::init();

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            app.manage(Mutex::new(AppState::default()));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            toggle_dock_icon,
            libsql::init_libsql,
            libsql::execute,
            libsql::select,
            fetch_inbox_top,
        ]);

    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(devtools);
    }

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}
