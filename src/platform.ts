import type { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';

import { IFeelShutter, TouchwandSwitch } from './platformAccessory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { TouchwandAPI } from './touchwandApi.js';
/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class TouchwandPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: Map<string, PlatformAccessory> = new Map();
  public readonly discoveredCacheUUIDs: string[] = [];

  private readonly hubIP: string;
  private readonly email: string;
  private readonly password: string;
  private readonly authenticationInterval: number = 1000 * 60 * 10;

  public readonly pollingInterval: number;

  public readonly touchwandApi: TouchwandAPI;

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.hubIP = config.hubIP;
    this.email = config.email;
    this.password = config.password;
    this.pollingInterval = config.pollingInterval ? parseInt(config.pollingInterval) * 1000 : 2500;

    this.log.debug('Touchwand Platform initialized with hubIP: %s, email: %s, password: %s', this.hubIP, this.email, this.password);

    this.log.debug('Finished initializing platform: ', this.config.name);
    this.touchwandApi = new TouchwandAPI(this.hubIP, this.email, this.password, this.log);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      this.touchwandApi.authenticate().then(() => {
        this.discoverDevices();
      });


      // Re-authenticate every <authenticationInterval> to keep us logged in.
      setInterval(() => {
        this.touchwandApi.authenticate();
      }, this.authenticationInterval);
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.set(accessory.UUID, accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {
    this.touchwandApi.getAllUnits().then(data => {
      this.log.info(`Got ${data.length} units`);
      this.log.info(`Units: ${JSON.stringify(data)}`);
  
      const shutters = data.filter((unitData: Record<string, unknown>) => unitData.type === 'shutter').map((unitData: Record<string, unknown>) => {
        return { id: unitData.id, displayName: unitData.name };
      });

      const switches = data.filter((unitData: Record<string, unknown>) => unitData.type === 'Switch').map((unitData: Record<string, unknown>) => {
        return { id: unitData.id, displayName: unitData.name };
      });

      this.log.info(`Shutters: ${JSON.stringify(shutters)}`);
      this.log.info(`Switches: ${JSON.stringify(switches)}`);

      // loop over the discovered devices and register each one if it has not already been registered
      for (const device of shutters) {

        // generate a unique id for the accessory this should be generated from
        // something globally unique, but constant, for example, the device serial
        // number or MAC address
        const uuid = this.api.hap.uuid.generate(device.id.toString());

        // see if an accessory with the same uuid has already been registered and restored from
        // the cached devices we stored in the `configureAccessory` method above
        const existingAccessory = this.accessories.get(uuid);

        if (existingAccessory) {
          // the accessory already exists
          this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

          // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
          // existingAccessory.context.device = device;
          // this.api.updatePlatformAccessories([existingAccessory]);

          // create the accessory handler for the restored accessory
          // this is imported from `platformAccessory.ts`
          new IFeelShutter(this, existingAccessory, device.id);

        } else {
          // the accessory does not yet exist, so we need to create it
          this.log.info('Adding new accessory:', device.displayName);

          // create a new accessory
          const accessory = new this.api.platformAccessory(device.displayName, uuid);

          // store a copy of the device object in the `accessory.context`
          // the `context` property can be used to store any data about the accessory you may need
          accessory.context.device = device;

          // create the accessory handler for the newly create accessory
          // this is imported from `platformAccessory.ts`
          new IFeelShutter(this, accessory, device.id);

          // link the accessory to your platform
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }

        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
        // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
  
      // loop over the discovered devices and register each one if it has not already been registered
      for (const device of switches) {

        // generate a unique id for the accessory this should be generated from
        // something globally unique, but constant, for example, the device serial
        // number or MAC address
        const uuid = this.api.hap.uuid.generate(device.id.toString());

        // see if an accessory with the same uuid has already been registered and restored from
        // the cached devices we stored in the `configureAccessory` method above
        const existingAccessory = this.accessories.get(uuid);

        if (existingAccessory) {
          // the accessory already exists
          this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

          // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
          // existingAccessory.context.device = device;
          // this.api.updatePlatformAccessories([existingAccessory]);

          // create the accessory handler for the restored accessory
          // this is imported from `platformAccessory.ts`
          new TouchwandSwitch(this, existingAccessory, device.id);

        } else {
          // the accessory does not yet exist, so we need to create it
          this.log.info('Adding new accessory:', device.displayName);

          // create a new accessory
          const accessory = new this.api.platformAccessory(device.displayName, uuid);

          // store a copy of the device object in the `accessory.context`
          // the `context` property can be used to store any data about the accessory you may need
          accessory.context.device = device;

          // create the accessory handler for the newly create accessory
          // this is imported from `platformAccessory.ts`
          new TouchwandSwitch(this, accessory, device.id);

          // link the accessory to your platform
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }

        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
        // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
        
    });

  }

}