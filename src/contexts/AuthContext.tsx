import React, { ReactNode, useEffect, useState } from "react";
import { Profile } from "../requests/types";

type AuthContextType = {
  getToken: () => Promise<string>;
  logOut: () => void;
  getProfile: () => Promise<Profile>;
  userId: string | null;
};

export const AuthContext = React.createContext<AuthContextType>({} as AuthContextType);

interface MainAppProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<MainAppProviderProps> = ({ children }) => {
  const [profile, setProfile] = useState<Profile>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const getToken = async () => {
    // get dynamically incase we need ot refresh
    return await window.electronAPI.getToken();
  };

  const getProfile = async () => {
    if (profile) {
      return profile;
    }
  };

  const logOut = async () => {
    window.electronAPI.logOut();
  };

  useEffect(() => {
    async function getAuthDetails() {
      try {
        const profile = await window.electronAPI.getProfile();
        setProfile(profile);
        setUserId(profile.sub);
      } catch (err) {
        console.error(err);
      }
    }
    getAuthDetails();
  }, []);

  if (!profile) {
    return <div> Loading... </div>;
  }

  return (
    <AuthContext.Provider
      value={{
        getToken,
        logOut,
        getProfile,
        userId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
