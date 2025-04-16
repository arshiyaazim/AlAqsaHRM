import { apiRequest } from "./queryClient";

/**
 * Uploads a file to the server
 * @param file The file to upload
 * @param endpoint The API endpoint to send the file to
 * @returns A promise that resolves to the server response
 */
export async function uploadFile(file: File, endpoint: string): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Error uploading file");
  }
  
  return await response.json();
}

/**
 * Processes an Excel file for employee import
 * @param file The Excel file to process
 * @returns A promise that resolves to the server response
 */
export async function importEmployeesFromExcel(filePath: string): Promise<any> {
  const response = await fetch("/api/import/employees", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filePath }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Error importing employees");
  }
  
  return await response.json();
}

/**
 * Checks if a file has an allowed extension
 * @param file The file to check
 * @param allowedExtensions Array of allowed extensions
 * @returns True if the file has an allowed extension, false otherwise
 */
export function hasAllowedExtension(file: File, allowedExtensions: string[]): boolean {
  const fileName = file.name.toLowerCase();
  return allowedExtensions.some(ext => fileName.endsWith(`.${ext}`));
}

/**
 * Formats a file size in bytes to a human-readable string
 * @param bytes The file size in bytes
 * @returns A human-readable string representation of the file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Modifies a field in an entity schema
 * @param entity The entity to modify (employees, projects, etc.)
 * @param operation The operation to perform (add, remove, rename)
 * @param field The field to modify, or field details for add/rename
 * @returns A promise that resolves to the server response
 */
export async function modifyEntityField(
  entity: string, 
  operation: "add" | "remove" | "rename", 
  field: string | { name: string; newName?: string; type?: string; required?: boolean }
): Promise<any> {
  const response = await fetch("/api/schema/customField", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ entity, operation, field }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Error modifying field");
  }
  
  return await response.json();
}