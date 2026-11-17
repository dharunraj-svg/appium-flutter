import { remote } from 'webdriverio';

export async function openSession(config) {
  return remote({
    hostname: config.appium.host,
    port: config.appium.port,
    path: '/',
    logLevel: 'warn',
    capabilities: config.capabilities,
  });
}

export async function closeSession(driver) {
  if (driver) {
    await driver.deleteSession();
  }
}
