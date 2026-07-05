import { useEffect, useState } from "react";
import api, { imageUrl } from "../services/api";

const fallbackSettings = {
  application_name: "FarmKart",
  home_page_caption: "Your Farm. Your Market.",
  home_page_description: "FarmKart connects farmers directly with buyers using smart technology, real-time orders, transport sharing, and AI-powered farming tools.",
  footer_text: "Direct farmer-to-buyer commerce with orders, transport, AI farming tools, and verified users.",
  copyright_text: "Copyright FarmKart. All rights reserved.",
  contact_email: "saipraveenareddypothula518@gmail.com",
  office_address: "Nandyal, Andhra Pradesh, India",
};

export function cmsAsset(path) {
  return path ? imageUrl(path) : "";
}

export default function useCms() {
  const [cms, setCms] = useState({ settings: fallbackSettings, banners: [], categories: [] });

  useEffect(() => {
    let ignore = false;
    api
      .get("/api/public/cms")
      .then((res) => {
        if (!ignore) {
          setCms({
            settings: { ...fallbackSettings, ...(res.data?.settings || {}) },
            banners: res.data?.banners || [],
            categories: res.data?.categories || [],
          });
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  return cms;
}
