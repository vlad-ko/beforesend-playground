use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::process::Command;

#[derive(Debug, Deserialize)]
struct TransformRequest {
    event: Value,
    #[serde(rename = "beforeSendCode")]
    before_send_code: String,
}

#[derive(Debug, Serialize)]
struct TransformResponse {
    success: bool,
    #[serde(rename = "transformedEvent", skip_serializing_if = "Option::is_none")]
    transformed_event: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    traceback: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ValidationRequest {
    code: String,
}

#[derive(Debug, Serialize)]
struct ValidationError {
    #[serde(skip_serializing_if = "Option::is_none")]
    line: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    column: Option<usize>,
    message: String,
}

#[derive(Debug, Serialize)]
struct ValidationResponse {
    valid: bool,
    errors: Vec<ValidationError>,
}

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: String,
    sdk: String,
}

async fn transform(req: web::Json<TransformRequest>) -> impl Responder {
    // Create a temporary directory for compilation
    let temp_dir = match tempfile::tempdir() {
        Ok(dir) => dir,
        Err(e) => {
            return HttpResponse::InternalServerError().json(TransformResponse {
                success: false,
                transformed_event: None,
                error: Some(format!("Failed to create temp directory: {}", e)),
                traceback: None,
            });
        }
    };

    let project_path = temp_dir.path();
    let src_path = project_path.join("src");

    // Create project structure
    if let Err(e) = fs::create_dir(&src_path) {
        return HttpResponse::InternalServerError().json(TransformResponse {
            success: false,
            transformed_event: None,
            error: Some(format!("Failed to create src directory: {}", e)),
            traceback: None,
        });
    }

    // Serialize event to JSON
    let event_json = match serde_json::to_string(&req.event) {
        Ok(json) => json,
        Err(e) => {
            return HttpResponse::BadRequest().json(TransformResponse {
                success: false,
                transformed_event: None,
                error: Some(format!("Failed to serialize event: {}", e)),
                traceback: None,
            });
        }
    };

    // Create Cargo.toml
    let cargo_toml = r#"[package]
name = "transform"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
"#;

    if let Err(e) = fs::write(project_path.join("Cargo.toml"), cargo_toml) {
        return HttpResponse::InternalServerError().json(TransformResponse {
            success: false,
            transformed_event: None,
            error: Some(format!("Failed to write Cargo.toml: {}", e)),
            traceback: None,
        });
    }

    // Create main.rs with user's beforeSend code
    let main_rs = format!(
        r##"use serde_json::{{json, Value}};

fn main() {{
    let event_json = r#"{}"#;
    let mut event: Value = serde_json::from_str(event_json).unwrap();

    // User's beforeSend code
    let result: Option<Value> = {{
        {}
    }};

    match result {{
        Some(transformed) => println!("{{}}", serde_json::to_string(&transformed).unwrap()),
        None => println!("null"),
    }}
}}
"##,
        event_json.replace("\"", "\\\""),
        req.before_send_code
    );

    if let Err(e) = fs::write(src_path.join("main.rs"), main_rs) {
        return HttpResponse::InternalServerError().json(TransformResponse {
            success: false,
            transformed_event: None,
            error: Some(format!("Failed to write main.rs: {}", e)),
            traceback: None,
        });
    }

    // Try to compile
    let compile_output = Command::new("cargo")
        .args(&["build", "--release", "--quiet"])
        .current_dir(project_path)
        .output();

    let compile_result = match compile_output {
        Ok(output) => output,
        Err(e) => {
            return HttpResponse::InternalServerError().json(TransformResponse {
                success: false,
                transformed_event: None,
                error: Some(format!("Failed to run cargo: {}", e)),
                traceback: None,
            });
        }
    };

    if !compile_result.status.success() {
        let error_msg = String::from_utf8_lossy(&compile_result.stderr).to_string();
        return HttpResponse::BadRequest().json(TransformResponse {
            success: false,
            transformed_event: None,
            error: Some(format!("Failed to compile beforeSend code: {}", error_msg)),
            traceback: Some(error_msg),
        });
    }

    // Execute the compiled binary
    let exec_output = Command::new(project_path.join("target/release/transform"))
        .output();

    let exec_result = match exec_output {
        Ok(output) => output,
        Err(e) => {
            return HttpResponse::InternalServerError().json(TransformResponse {
                success: false,
                transformed_event: None,
                error: Some(format!("Failed to execute transform: {}", e)),
                traceback: None,
            });
        }
    };

    if !exec_result.status.success() {
        let error_msg = String::from_utf8_lossy(&exec_result.stderr).to_string();
        return HttpResponse::InternalServerError().json(TransformResponse {
            success: false,
            transformed_event: None,
            error: Some(format!("Transformation error: {}", error_msg)),
            traceback: Some(error_msg),
        });
    }

    // Parse output
    let output_str = String::from_utf8_lossy(&exec_result.stdout).to_string();
    let transformed_event: Option<Value> = if output_str.trim() == "null" {
        None
    } else {
        match serde_json::from_str(&output_str) {
            Ok(value) => Some(value),
            Err(e) => {
                return HttpResponse::InternalServerError().json(TransformResponse {
                    success: false,
                    transformed_event: None,
                    error: Some(format!("Failed to parse result: {}", e)),
                    traceback: None,
                });
            }
        }
    };

    HttpResponse::Ok().json(TransformResponse {
        success: true,
        transformed_event,
        error: None,
        traceback: None,
    })
}

async fn validate(req: web::Json<ValidationRequest>) -> impl Responder {
    // Create a temporary directory for validation
    let temp_dir = match tempfile::tempdir() {
        Ok(dir) => dir,
        Err(e) => {
            return HttpResponse::InternalServerError().json(ValidationResponse {
                valid: false,
                errors: vec![ValidationError {
                    line: None,
                    column: None,
                    message: format!("Validation service error: {}", e),
                }],
            });
        }
    };

    let project_path = temp_dir.path();
    let src_path = project_path.join("src");

    // Create project structure
    if let Err(e) = fs::create_dir(&src_path) {
        return HttpResponse::InternalServerError().json(ValidationResponse {
            valid: false,
            errors: vec![ValidationError {
                line: None,
                column: None,
                message: format!("Validation service error: {}", e),
            }],
        });
    }

    // Create minimal Cargo.toml
    let cargo_toml = r#"[package]
name = "validate"
version = "0.1.0"
edition = "2021"

[dependencies]
serde_json = "1.0"
"#;

    if let Err(e) = fs::write(project_path.join("Cargo.toml"), cargo_toml) {
        return HttpResponse::InternalServerError().json(ValidationResponse {
            valid: false,
            errors: vec![ValidationError {
                line: None,
                column: None,
                message: format!("Validation service error: {}", e),
            }],
        });
    }

    // Create main.rs with user's code
    let main_rs = format!(
        r#"use serde_json::Value;

fn main() {{
    let _result: Option<Value> = {{
        {}
    }};
}}
"#,
        req.code
    );

    if let Err(e) = fs::write(src_path.join("main.rs"), main_rs) {
        return HttpResponse::InternalServerError().json(ValidationResponse {
            valid: false,
            errors: vec![ValidationError {
                line: None,
                column: None,
                message: format!("Validation service error: {}", e),
            }],
        });
    }

    // Try to compile (just check, don't build)
    let check_output = Command::new("cargo")
        .args(&["check", "--quiet"])
        .current_dir(project_path)
        .output();

    let check_result = match check_output {
        Ok(output) => output,
        Err(e) => {
            return HttpResponse::InternalServerError().json(ValidationResponse {
                valid: false,
                errors: vec![ValidationError {
                    line: None,
                    column: None,
                    message: format!("Validation service error: {}", e),
                }],
            });
        }
    };

    if !check_result.status.success() {
        let error_msg = String::from_utf8_lossy(&check_result.stderr).to_string();

        // Try to parse line number from error message
        // Rust errors typically look like: "error: ... --> src/main.rs:5:10"
        let mut errors = vec![];
        for line in error_msg.lines() {
            if line.contains("error") {
                let parts: Vec<&str> = line.split(":").collect();
                if parts.len() >= 3 {
                    if let Some(line_num_str) = parts.iter().rev().nth(1) {
                        if let Ok(line_num) = line_num_str.trim().parse::<usize>() {
                            errors.push(ValidationError {
                                line: Some(line_num),
                                column: None,
                                message: error_msg.clone(),
                            });
                            break;
                        }
                    }
                }
                errors.push(ValidationError {
                    line: None,
                    column: None,
                    message: error_msg.clone(),
                });
                break;
            }
        }

        if errors.is_empty() {
            errors.push(ValidationError {
                line: None,
                column: None,
                message: error_msg,
            });
        }

        return HttpResponse::Ok().json(ValidationResponse {
            valid: false,
            errors,
        });
    }

    HttpResponse::Ok().json(ValidationResponse {
        valid: true,
        errors: vec![],
    })
}

async fn health() -> impl Responder {
    HttpResponse::Ok().json(HealthResponse {
        status: "healthy".to_string(),
        sdk: "rust".to_string(),
    })
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Rust SDK service listening on port 5010");

    HttpServer::new(|| {
        App::new()
            .route("/transform", web::post().to(transform))
            .route("/validate", web::post().to(validate))
            .route("/health", web::get().to(health))
    })
    .bind(("0.0.0.0", 5010))?
    .run()
    .await
}
