import { Controller, Get } from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

@Controller()
export class AppController {
  private version: string;

  constructor() {
    try {
      // Try to read version from version.json first (Docker build)
      const versionFilePath = join(__dirname, '../version.json');
      if (existsSync(versionFilePath)) {
        const versionFile = JSON.parse(readFileSync(versionFilePath, 'utf-8'));
        this.version = versionFile.version;
      } else {
        // Fallback to package.json
        const packageJson = JSON.parse(
          readFileSync(join(__dirname, '../package.json'), 'utf-8')
        );
        this.version = packageJson.version;
      }
    } catch (error) {
      this.version = 'unknown';
    }
  }

  @Get('version')
  getVersion() {
    return {
      version: this.version,
      service: 'blueprint-backend'
    };
  }

  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      version: this.version,
      timestamp: new Date().toISOString()
    };
  }
}
