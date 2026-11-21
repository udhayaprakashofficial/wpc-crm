"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Fires Meta Pixel Purchase when NEXT_PUBLIC_FACEBOOK_PIXEL_ID is set.
 * The /pay/success URL itself is also usable as a Facebook conversion URL.
 */
export function PurchasePixel({ plan }: { plan?: string }) {
  useEffect(() => {
    const pixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID?.trim();
    if (!pixelId || typeof window === "undefined") return;

    const value =
      plan === "paid_yearly" ? 3990 : plan === "paid_monthly" ? 399 : undefined;

    const fire = () => {
      if (typeof window.fbq !== "function") return;
      window.fbq("track", "Purchase", {
        currency: "INR",
        ...(value != null ? { value } : {}),
        content_name: plan || "WPC CRM",
      });
    };

    if (typeof window.fbq === "function") {
      fire();
      return;
    }

    // Load pixel once if not already present (e.g. no global layout script yet)
    if (document.getElementById("fb-pixel-wpc")) {
      const t = window.setInterval(() => {
        if (typeof window.fbq === "function") {
          window.clearInterval(t);
          fire();
        }
      }, 200);
      window.setTimeout(() => window.clearInterval(t), 5000);
      return;
    }

    const script = document.createElement("script");
    script.id = "fb-pixel-wpc";
    script.innerHTML = `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${pixelId}');
fbq('track','PageView');
`;
    document.head.appendChild(script);
    fire();
  }, [plan]);

  return null;
}
