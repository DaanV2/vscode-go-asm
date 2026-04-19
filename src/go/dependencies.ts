import { Uri } from "vscode";
import { executeCommand } from "../commands/commands";
import { goFSPath } from "../format";
import { parseFunctionSymbols } from "./symbols";

export async function getFunctions(uri: Uri): Promise<string[]> {
  const fs = goFSPath(uri);
  const data = await executeCommand("gopls", ["symbols", fs]);

  // Example data:
  // gopls symbols .\bcrypt.go
  // HashPassword Function 10:6-10:18
  // ComparePassword Function 15:6-15:21

  // gopls symbols .\rsa.go
  // RSAKey Struct 11:6-11:12
  //         id Field 12:2-12:4
  //         key Field 13:2-13:5
  // (*RSAKey).ID Method 16:18-16:20
  // (*RSAKey).Private Method 20:18-20:25
  // (*RSAKey).Public Method 24:18-24:24
  // GenerateRSAKeys Function 28:6-28:21
  return parseFunctionSymbols(data.stdout);
}
