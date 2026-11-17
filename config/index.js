import { buildCapabilities } from './capabilities.js';
import { selectApp } from './apps.js';
import { readAndroidDeviceConfig, readAppiumConfig, readDeviceConfig, readSimulatorLocation } from './env.js';
import { readEmployee, readKioskStaff } from './users.js';

const USER_READERS = {
  kioskStaff: readKioskStaff,
  employee: readEmployee,
};

export function loadSuiteConfig({ users = [], location = false } = {}, source = process.env) {
  const app = selectApp(source);
  const device = app.platform === 'android' ? readAndroidDeviceConfig(source) : readDeviceConfig(source);

  const config = {
    appium: readAppiumConfig(source),
    app,
    device,
    capabilities: buildCapabilities({ app, device }),
    users: {},
  };

  for (const role of users) {
    const reader = USER_READERS[role];
    if (!reader) {
      throw new Error(`Unknown test user role "${role}". Known roles: ${Object.keys(USER_READERS).join(', ')}.`);
    }
    config.users[role] = reader(source);
  }

  if (location) {
    config.location = readSimulatorLocation(source);
  }

  return config;
}
