import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import * as url from "url";
import { storeToken, getRefreshToken, clearToken } from "./StoreService";
import env from "../env.json";
import { jwtDecode } from "jwt-decode";
import { app } from "electron";

const { AUTH0_DOMAIN, API_IDENTIFIER, CLIENT_ID } = env;

// Use different redirect URIs based on app mode
const getRedirectUri = (): string => {
  const isPackaged = app.isPackaged;
  return isPackaged ? "maccomputeruse://callback" : "http://localhost/callback";
};

class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private profile: any = null;

  constructor() {}

  private async request<T = any>(options: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      return await axios(options);
    } catch (error: any) {
      // Optionally, you can add more sophisticated error handling here
      throw error;
    }
  }

  public getAuthenticationURL(): string {
    const redirectUri = getRedirectUri();
    return `https://${AUTH0_DOMAIN}/authorize?audience=${API_IDENTIFIER}&scope=openid profile offline_access&response_type=code&client_id=${CLIENT_ID}&redirect_uri=${redirectUri}`;
  }

  public async loadTokens(callbackURL: string): Promise<void> {
    const urlParts = url.parse(callbackURL, true);
    const query = urlParts.query;

    const exchangeOptions = {
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code: query.code,
      redirect_uri: getRedirectUri(),
    };

    const options: AxiosRequestConfig = {
      method: "POST",
      url: `https://${AUTH0_DOMAIN}/oauth/token`,
      headers: {
        "content-type": "application/json",
      },
      data: JSON.stringify(exchangeOptions),
    };

    try {
      const response = await this.request(options);

      this.accessToken = response.data.access_token;
      this.profile = jwtDecode(response.data.id_token);
      this.refreshToken = response.data.refresh_token;

      if (this.refreshToken) {
        await storeToken("refresh", this.refreshToken);
      }
    } catch (error) {
      await this.logout();
      throw error;
    }
  }

  public async refreshTokens(): Promise<void> {
    const refreshToken: string | null = await getRefreshToken();

    if (refreshToken) {
      const refreshOptions: AxiosRequestConfig = {
        method: "POST",
        url: `https://${AUTH0_DOMAIN}/oauth/token`,
        headers: { "content-type": "application/json" },
        data: {
          refresh_token: refreshToken,
          client_id: CLIENT_ID,
          grant_type: "refresh_token",
        },
      };

      try {
        const response = await this.request(refreshOptions);
        this.accessToken = response.data.access_token;
        this.profile = jwtDecode(response.data.id_token);
        await storeToken("access", this.accessToken);
      } catch (error) {
        await this.logout();
        throw error;
      }
    } else {
      throw new Error("No available refresh token.");
    }
  }

  public getLogOutUrl(): string {
    return `https://${AUTH0_DOMAIN}/v2/logout`;
  }

  public getProfile(): any {
    return this.profile;
  }

  public async logout(): Promise<void> {
    await clearToken();
    this.accessToken = null;
    this.profile = null;
    this.refreshToken = null;
  }
}

const authService = new AuthService();

export default authService;
