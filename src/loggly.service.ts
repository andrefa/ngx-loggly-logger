import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Cookie } from 'ng2-cookies';
import { LogglyConfig } from './loggly-config.model';

@Injectable()
export class LogglyService {

  private LOGGLY_INPUT_PREFIX: string = 'http' + (('https:' === document.location.protocol ? 's' : '')) + '://';
  private LOGGLY_COLLECTOR_DOMAIN: string = 'logs-01.loggly.com';
  private LOGGLY_CONFIG_KEY: string = 'loggly-track-config';
  private LOGGLY_PROXY_DOMAIN: string = 'loggly';

  constructor(private http: HttpClient) {
    this.config(this.readConfig());
  }

  config(data: LogglyConfig): void {
    const defaultConfig: LogglyConfig = {
      sendConsoleErrors: true,
      useDomainProxy: false
    }

    const configuration = { ...defaultConfig, ...this.readConfig(), ...data };

    if (configuration.sendConsoleErrors){
      this.setSendConsoleError();
    }

    if (!configuration.sessionId) {
      configuration.sessionId = this.uuid();
    }

    this.saveConfig(configuration);
  }

  push(data: object): void {
    const type = typeof data;
    if (!data || !(type === 'object' || type === 'string')) {
      return;
    }

    if (type === 'string') {
      data = { text: data };
    }

    this.track(data);
  }

  private track(data: object) {
    return this.http.post(this.getInputUrl(), { ...data, sessionId: this.readConfig().sessionId }, this.headers());
  }

  private getInputUrl(): string {
    const configuration: LogglyConfig = this.readConfig();
    const { logglyKey, tag, useDomainProxy } = configuration;
    const host = useDomainProxy ? window.location.host : (configuration.logglyCollectorDomain || this.LOGGLY_COLLECTOR_DOMAIN);

    return `${this.LOGGLY_INPUT_PREFIX}${host}/${this.LOGGLY_PROXY_DOMAIN}/inputs/${logglyKey}/tag/${tag}`
  }

  private setSendConsoleError() {
    const _onerror = window.onerror;
    window.onerror = function (message, url, lineno, colno) {
      this.push({
        category: 'BrowserJsException',
        exception: { message, url, lineno, colno }
      });

      if (_onerror && typeof _onerror === 'function') {
        _onerror.apply(window, arguments);
      }
    };
  }

  private uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private headers(): object {
    return { headers: new HttpHeaders().set('Content-Type', 'text/plain') };
  }

  private readConfig(): LogglyConfig {
    const savedConfig = Cookie.get(this.LOGGLY_CONFIG_KEY);
    return savedConfig ? JSON.parse(savedConfig) : {};
  }

  private saveConfig(config: LogglyConfig): void {
    Cookie.set(this.LOGGLY_CONFIG_KEY, JSON.stringify(config));
  }

}
