import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { Logger } from 'homebridge';

/**
 * A singleton i-feel shutters API class.
 */
export class TouchwandAPI {
  private readonly api: AxiosInstance;
  private readonly logger: Logger;
  private readonly cookieJar;

  private readonly baseUrl: string;
  private readonly email: string;
  private readonly password: string;
  
  constructor(hubIP: string, email: string, password: string, logger: Logger) {
    this.baseUrl = 'http://' + hubIP + '/';
    this.email = email;
    this.password = password;

    this.logger = logger;
    this.cookieJar = new CookieJar();
    this.api = wrapper(axios.create({
      baseURL: this.baseUrl,
      withCredentials: true,
      jar: this.cookieJar,
    }));
  }

  private getRequestConfig(params: Record<string, unknown> | null = null): AxiosRequestConfig {
    const config = {
      withCredentials: true,
      jar: this.cookieJar,
      headers: {
        'Content-Type': 'application/json',
      },
      params: params,
    };


    this.logger.info(`Request config: ${JSON.stringify(config)}`);
    return config;
  }

  public async authenticate() {
    const params = {
      user: this.email,
      psw: this.password,
    };

    this.logger.info('Sending authentication request to touchwand hub.');
    try {
      const response = await this.api.get('auth/login', this.getRequestConfig(params));
      this.logger.info(`Got authentication response of ${response.status}`);
      // The cookie will identify us for the next ~30 minutes.
      this.logger.info('Successfully authenticated with touchwand hub.');
    } catch(error) {
      this.logger.warn('Login failed', error);
    }    
  }

  
  public async postShutterAction(id: number, value: number) {
    const data = {
      id: id,
      value: value,
    };

    try {
      this.logger.info(`Posting unit action to i-feel shutter. id ${id}, value: ${value}`);
      const response = await this.api.post('units/action', data, this.getRequestConfig());
      this.logger.info(`Got unit action response of ${response.status}`);  
    } catch(error) {
      this.logger.warn('postShutterAction', error);
    }    
  }

  public async getShutterPosition(id: number) {
    const params = {
      id: id,
    };

    try {
      this.logger.info(`Getting unit data for i-feel shutter. id ${id}`);
      const response = await this.api.get('units/getUnitByID', this.getRequestConfig(params));
      this.logger.info(`Got unit data response of ${response.status}`);
      return response.data.currStatus;  
    } catch(error) {
      this.logger.warn('getShutterPosition error', error);
      return 0;
    }   
  }

  public async getSwitchState(id: number) {
    const params = {
      id: id,
    };

    try {
      this.logger.info(`Getting unit data for i-feel shutter. id ${id}`);
      const response = await this.api.get('units/getUnitByID', this.getRequestConfig(params));
      this.logger.info(`Got unit data response of ${response.status}`);
      return response.data.currStatus > 0;
    } catch(error) {
      this.logger.warn('getSwitchState error', error);
      return false;
    }   
  }

  public async getAllUnits() {
    try {
      this.logger.info('Getting ALL units data from i-feel hub.');
      const response = await this.api.get('units/listUnits', this.getRequestConfig());
      this.logger.info(`Got ALL units data response of ${response.status}`);
  
      return response.data;
    } catch(error) {
      this.logger.warn('getAllUnits error', error);
      return {};
    }  
  }

  public async postSwitchAction(id: number, value: number) {
    const data = {
      id: id,
      value: value,
    };

    try {
      this.logger.info(`Posting unit action to touchwant switch. id ${id}, value: ${value}`);
      const response = await this.api.post('units/action', data, this.getRequestConfig());
      this.logger.info(`Got unit action response of ${response.status}`);
    } catch(error) {
      this.logger.warn('postSwitchAction error', error);
      return {};
    } 
  }
}