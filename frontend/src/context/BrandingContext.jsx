import React, { createContext, useContext, useState, useEffect } from 'react';

const BrandingContext = createContext();

const DEFAULT_BRANDING = {
  orgName: 'Global Certification Authority',
  tagline: 'Global Credential Network',
  subtitle: 'Enterprise Digital Credential Infrastructure',
  supportEmail: 'credentials@globalcert.org'
};

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(() => {
    try {
      const savedOrg = localStorage.getItem('smartcert_org_name');
      const savedTagline = localStorage.getItem('smartcert_org_tagline');
      const savedSubtitle = localStorage.getItem('smartcert_org_subtitle');
      const savedEmail = localStorage.getItem('smartcert_org_email');
      return {
        orgName: savedOrg || DEFAULT_BRANDING.orgName,
        tagline: savedTagline || DEFAULT_BRANDING.tagline,
        subtitle: savedSubtitle || DEFAULT_BRANDING.subtitle,
        supportEmail: savedEmail || DEFAULT_BRANDING.supportEmail
      };
    } catch (e) {
      return DEFAULT_BRANDING;
    }
  });

  const updateBranding = (newBranding) => {
    const updated = { ...branding, ...newBranding };
    setBranding(updated);
    try {
      if (updated.orgName) localStorage.setItem('smartcert_org_name', updated.orgName);
      if (updated.tagline) localStorage.setItem('smartcert_org_tagline', updated.tagline);
      if (updated.subtitle) localStorage.setItem('smartcert_org_subtitle', updated.subtitle);
      if (updated.supportEmail) localStorage.setItem('smartcert_org_email', updated.supportEmail);
    } catch (e) {
      console.warn('Failed to save branding to localStorage:', e);
    }
  };

  const resetBranding = () => {
    setBranding(DEFAULT_BRANDING);
    try {
      localStorage.removeItem('smartcert_org_name');
      localStorage.removeItem('smartcert_org_tagline');
      localStorage.removeItem('smartcert_org_subtitle');
      localStorage.removeItem('smartcert_org_email');
    } catch (e) {}
  };

  return (
    <BrandingContext.Provider value={{ ...branding, updateBranding, resetBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    return {
      ...DEFAULT_BRANDING,
      updateBranding: () => {},
      resetBranding: () => {}
    };
  }
  return context;
}
