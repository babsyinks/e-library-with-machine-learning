import { Global, Module } from "@nestjs/common";
import { MalwareScannerService } from "./malware-scanner.service";
import { StorageService } from "./storage.service";

@Global()
@Module({
  providers: [StorageService, MalwareScannerService],
  exports: [StorageService],
})
export class StorageModule {}
