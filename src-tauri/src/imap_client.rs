use std::env;

use crate::settings::Settings;
use anyhow::Result;
use chrono::{DateTime, Utc};
use html2text::from_read;
use mailparse::MailHeaderMap;
use regex::Regex;
use serde::{Deserialize, Serialize};
#[derive(Debug, Serialize, Deserialize)]
pub struct Message {
    pub date: DateTime<Utc>,
    pub subject: String,
    pub body: String,
    pub clean_text: String,
}

fn remove_urls(input: &str) -> String {
    let url_regex = Regex::new(r"https?://[^\s]+|www\.[^\s]+").unwrap();
    let cleaned = url_regex.replace_all(input, "");
    let whitespace_regex = Regex::new(r"\s+").unwrap();
    whitespace_regex.replace_all(&cleaned, " ").to_string()
}

pub fn parse_email_to_message(mail_body: &str, _id: Option<i32>) -> Result<Message> {
    // Parse the email
    let parsed_mail = mailparse::parse_mail(mail_body.as_bytes())?;

    // Extract subject (with fallback to empty string if not found)
    let subject = parsed_mail
        .headers
        .get_first_value("Subject")
        .unwrap_or_else(|| String::from(""));

    // Extract date (with fallback to current time if not found or parsing fails)
    let date = parsed_mail
        .headers
        .get_first_value("Date")
        .and_then(|date_str| mailparse::dateparse(&date_str).ok())
        .map(|timestamp| {
            chrono::DateTime::from_timestamp(timestamp, 0).unwrap_or_else(|| Utc::now())
        })
        .unwrap_or_else(|| Utc::now());

    // Get body content
    let body = parsed_mail.get_body()?;

    // Extract clean text based on content type
    let clean_text = if parsed_mail.ctype.mimetype.starts_with("text/html") {
        // Convert HTML to plain text
        from_read(body.as_bytes(), 80)?
    } else {
        // Already plain text
        body.clone()
    };

    let clean_text = remove_urls(&clean_text);

    // Create the message struct
    let message: Message = Message {
        date,
        subject,
        body,
        clean_text,
    };

    Ok(message)
}

fn dump(pfx: &str, pm: &mailparse::ParsedMail) {
    println!(">> Headers from {} <<", pfx);
    for h in &pm.headers {
        println!("  [{}] => [{}]", h.get_key(), h.get_value());
    }
    println!(">> Addresses from {} <<", pfx);
    pm.headers
        .get_first_value("From")
        .map(|a| println!("{:?}", mailparse::addrparse(&a).unwrap()));
    pm.headers
        .get_first_value("To")
        .map(|a| println!("{:?}", mailparse::addrparse(&a).unwrap()));
    pm.headers
        .get_first_value("Cc")
        .map(|a| println!("{:?}", mailparse::addrparse(&a).unwrap()));
    pm.headers
        .get_first_value("Bcc")
        .map(|a| println!("{:?}", mailparse::addrparse(&a).unwrap()));
    println!(">> Body from {} <<", pfx);
    if pm.ctype.mimetype.starts_with("text/") {
        println!("  [{}]", pm.get_body().unwrap());
    } else {
        println!(
            "   (Body is binary type {}, {} bytes in length)",
            pm.ctype.mimetype,
            pm.get_body().unwrap().len()
        );
    }
    let mut c = 1;
    for s in &pm.subparts {
        println!(">> Subpart {} <<", c);
        dump("subpart", s);
        c += 1;
    }
}

pub fn fetch_inbox_top(settings: &Settings, count: Option<usize>) -> anyhow::Result<Vec<Message>> {
    let settings = settings
        .account
        .as_ref()
        .ok_or_else(|| anyhow::anyhow!("Account settings not found"))?;

    let domain = &settings.hostname;
    let username = &settings.username;
    let password = &settings.password;
    let port = settings.port;

    // Print all settings for debugging
    println!("IMAP Settings:");
    println!("  Domain: {}", domain);
    println!("  Username: {}", username);
    println!("  Password: {}", password);
    println!("  Port: {}", port);

    let client = imap::ClientBuilder::new(&domain, port)
        // .mode(imap::ConnectionMode::Tls)
        .danger_skip_tls_verify(true)
        .connect()?;

    let mut imap_session = client
        .login(&username, &password)
        .map_err(|e| anyhow::anyhow!(e.0))?;

    // imap_session.debug = true;
    imap_session.select("INBOX")?;

    let count = count.unwrap_or(10);
    let fetch_range = format!("1:{}", count);

    let messages = imap_session.fetch(&fetch_range, "RFC822")?;
    let mut result: Vec<Message> = Vec::new();

    for message in messages.iter() {
        let body = message.body().expect("message did not have a body!");
        let body = std::str::from_utf8(body)
            .expect("message was not valid utf-8")
            .to_string();

        result.push(parse_email_to_message(&body, None)?);
    }

    // be nice to the server and log out
    imap_session.logout()?;

    Ok(result)
}

pub fn listen_for_emails() -> imap::error::Result<()> {
    // Try to load from .env if present, continue if not found
    if let Ok(path) = env::var("CARGO_MANIFEST_DIR") {
        let env_path = std::path::Path::new(&path).join(".env");
        if env_path.exists() {
            dotenv::from_path(env_path).ok();
        }
    }

    let domain = env::var("IMAP_DOMAIN").expect("IMAP_DOMAIN environment variable must be set");
    let username =
        env::var("IMAP_USERNAME").expect("IMAP_USERNAME environment variable must be set");
    let password =
        env::var("IMAP_PASSWORD").expect("IMAP_PASSWORD environment variable must be set");
    let port = env::var("IMAP_PORT")
        .expect("IMAP_PORT environment variable must be set")
        .parse::<u16>()
        .expect("IMAP_PORT must be a valid port number");

    let client = imap::ClientBuilder::new(&domain, port)
        // .mode(imap::ConnectionMode::Tls)
        .danger_skip_tls_verify(true)
        .connect()?;

    let mut imap_session = client.login(&username, &password).map_err(|e| e.0)?;

    imap_session.debug = true;

    imap_session
        .select("INBOX")
        .expect("Could not select mailbox");

    let mut num_responses = 0;
    let max_responses = 5;
    let idle_result = imap_session.idle().wait_while(|response| {
        num_responses += 1;
        println!("IDLE response #{}: {:?}", num_responses, response);

        if let imap::types::UnsolicitedResponse::Recent(uid) = response {
            println!("Recent uid: {:?}", uid);
        }

        if num_responses >= max_responses {
            // Stop IDLE
            false
        } else {
            // Continue IDLE
            true
        }
    });

    match idle_result {
        Ok(reason) => println!("IDLE finished normally {:?}", reason),
        Err(e) => println!("IDLE finished with error {:?}", e),
    }

    imap_session.logout().expect("Could not log out");

    Ok(())
}
