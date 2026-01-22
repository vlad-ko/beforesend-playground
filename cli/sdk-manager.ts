#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface SDK {
  name: string;
  language: string;
  default: boolean;
  status: 'available' | 'running' | 'not-installed';
  port: number;
  dockerfile?: string;
  template?: string;
  packageManager: string;
  packages: string[];
  description: string;
  notes?: string;
}

interface SDKRegistry {
  sdks: Record<string, SDK>;
}

const ROOT_DIR = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT_DIR, 'sdks', 'registry.json');
const DOCKER_COMPOSE_PATH = path.join(ROOT_DIR, 'docker-compose.yml');

class SDKManager {
  private registry: SDKRegistry;

  constructor() {
    this.registry = this.loadRegistry();
  }

  private loadRegistry(): SDKRegistry {
    try {
      const content = fs.readFileSync(REGISTRY_PATH, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(chalk.red('Failed to load SDK registry:'), error);
      process.exit(1);
    }
  }

  private saveRegistry(): void {
    try {
      fs.writeFileSync(
        REGISTRY_PATH,
        JSON.stringify(this.registry, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error(chalk.red('Failed to save SDK registry:'), error);
      process.exit(1);
    }
  }

  listSDKs(): void {
    console.log(chalk.bold('\n📦 Available SDKs:\n'));

    for (const [key, sdk] of Object.entries(this.registry.sdks)) {
      const statusColor =
        sdk.status === 'available'
          ? chalk.green
          : sdk.status === 'running'
          ? chalk.blue
          : chalk.gray;

      const defaultLabel = sdk.default ? chalk.yellow(' [DEFAULT]') : '';
      console.log(
        `${chalk.bold(sdk.name)}${defaultLabel} ${statusColor(`(${sdk.status})`)}`
      );
      console.log(`  Language: ${sdk.language}`);
      console.log(`  Port: ${sdk.port}`);
      console.log(`  Description: ${sdk.description}`);
      if (sdk.notes) {
        console.log(`  Notes: ${chalk.dim(sdk.notes)}`);
      }
      console.log('');
    }
  }

  async startSDK(sdkKey: string): Promise<void> {
    const sdk = this.registry.sdks[sdkKey];

    if (!sdk) {
      console.error(chalk.red(`SDK "${sdkKey}" not found`));
      process.exit(1);
    }

    if (sdk.status === 'not-installed') {
      console.error(
        chalk.red(
          `SDK "${sdk.name}" is not installed. Run: ${chalk.bold(`npm run sdk:install ${sdkKey}`)}`
        )
      );
      process.exit(1);
    }

    console.log(chalk.blue(`Starting ${sdk.name} SDK...`));

    try {
      // Start the SDK container using docker-compose profiles
      execSync(
        `docker-compose --profile ${sdkKey} up -d sdk-${sdkKey}`,
        {
          cwd: ROOT_DIR,
          stdio: 'inherit',
        }
      );

      sdk.status = 'running';
      this.saveRegistry();

      console.log(chalk.green(`✓ ${sdk.name} SDK started on port ${sdk.port}`));
    } catch (error) {
      console.error(chalk.red(`Failed to start ${sdk.name} SDK`));
      process.exit(1);
    }
  }

  async stopSDK(sdkKey: string): Promise<void> {
    const sdk = this.registry.sdks[sdkKey];

    if (!sdk) {
      console.error(chalk.red(`SDK "${sdkKey}" not found`));
      process.exit(1);
    }

    console.log(chalk.blue(`Stopping ${sdk.name} SDK...`));

    try {
      execSync(`docker-compose stop sdk-${sdkKey}`, {
        cwd: ROOT_DIR,
        stdio: 'inherit',
      });

      sdk.status = 'available';
      this.saveRegistry();

      console.log(chalk.green(`✓ ${sdk.name} SDK stopped`));
    } catch (error) {
      console.error(chalk.red(`Failed to stop ${sdk.name} SDK`));
      process.exit(1);
    }
  }

  async startDefault(): Promise<void> {
    console.log(chalk.blue('Starting default SDKs (JavaScript, Python)...\n'));

    try {
      execSync('docker-compose --profile default up -d', {
        cwd: ROOT_DIR,
        stdio: 'inherit',
      });

      // Update status for default SDKs
      for (const [key, sdk] of Object.entries(this.registry.sdks)) {
        if (sdk.default && sdk.status === 'available') {
          sdk.status = 'running';
        }
      }

      this.saveRegistry();

      console.log(chalk.green('\n✓ Default SDKs started'));
      console.log(chalk.dim('Access the playground at: http://localhost:3000'));
    } catch (error) {
      console.error(chalk.red('Failed to start default SDKs'));
      process.exit(1);
    }
  }

  async stopAll(): Promise<void> {
    console.log(chalk.blue('Stopping all SDKs...\n'));

    try {
      execSync('docker-compose down', {
        cwd: ROOT_DIR,
        stdio: 'inherit',
      });

      // Update status for all SDKs
      for (const sdk of Object.values(this.registry.sdks)) {
        if (sdk.status === 'running') {
          sdk.status = 'available';
        }
      }

      this.saveRegistry();

      console.log(chalk.green('\n✓ All SDKs stopped'));
    } catch (error) {
      console.error(chalk.red('Failed to stop SDKs'));
      process.exit(1);
    }
  }

  async installSDK(sdkKey: string): Promise<void> {
    const sdk = this.registry.sdks[sdkKey];

    if (!sdk) {
      console.error(chalk.red(`SDK "${sdkKey}" not found in registry`));
      process.exit(1);
    }

    if (sdk.status === 'available') {
      console.log(chalk.yellow(`SDK "${sdk.name}" is already installed`));
      return;
    }

    console.log(chalk.blue(`Installing ${sdk.name} SDK...`));

    // TODO: Implement template-based SDK installation
    // For now, just show what would happen
    console.log(chalk.dim('This would:'));
    console.log(chalk.dim(`  1. Generate Dockerfile from template: ${sdk.template}`));
    console.log(chalk.dim(`  2. Create directory: sdks/${sdkKey}/`));
    console.log(chalk.dim(`  3. Install packages: ${sdk.packages.join(', ')}`));
    console.log(chalk.dim(`  4. Add to docker-compose.yml`));
    console.log('');
    console.log(
      chalk.yellow(
        `⚠️  Dynamic SDK installation not yet implemented. Coming in Phase 2!`
      )
    );
    console.log(chalk.dim('For now, use the default SDKs: javascript, python'));
  }
}

// CLI Program
const program = new Command();
const manager = new SDKManager();

program
  .name('sdk')
  .description('Manage Sentry SDK containers for beforeSend testing')
  .version('1.0.0');

program
  .command('list')
  .alias('ls')
  .description('List all available SDKs')
  .action(() => {
    manager.listSDKs();
  });

program
  .command('start [sdk]')
  .description('Start SDK container(s). No argument = start default SDKs')
  .action(async (sdk) => {
    if (sdk) {
      await manager.startSDK(sdk);
    } else {
      await manager.startDefault();
    }
  });

program
  .command('stop [sdk]')
  .description('Stop SDK container(s). No argument = stop all SDKs')
  .action(async (sdk) => {
    if (sdk) {
      await manager.stopSDK(sdk);
    } else {
      await manager.stopAll();
    }
  });

program
  .command('install <sdk>')
  .description('Install a new SDK from template (coming in Phase 2)')
  .action(async (sdk) => {
    await manager.installSDK(sdk);
  });

program.parse();
