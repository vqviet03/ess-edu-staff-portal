"use client";
import {useEffect} from "react";
import {useAppSelector,useAppDispatch} from "@/store";
import {apiConfiguration} from "@/api/config";
import {api} from "@/api/api";
import {useLazyPushNoticeQuery} from "@/api/pwa-api";
import {showNoticeToast} from "@/features/notifications/events";
import {portal,basePath,registerWorker} from "./platform";
import {useApplicationSettingsQuery} from "@/api/settings-api";
export function PwaRuntime(){
 const {data}=useApplicationSettingsQuery(),authenticated=useAppSelector(s=>!!s.auth.session),dispatch=useAppDispatch(),[notice]=useLazyPushNoticeQuery();
 useEffect(()=>{if(!data||apiConfiguration.error)return;const branding=data.portals?.[portal],name=branding?.name||data.appName;
  const ensure=(tag:"link"|"meta",selector:string,attrs:Record<string,string>)=>{let el=document.head.querySelector(selector);if(!el){el=document.createElement(tag);document.head.append(el);}for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);};
  const params=new URLSearchParams({portal,origin:location.origin,basePath});ensure("link",'link[rel="manifest"]',{rel:"manifest",href:`${apiConfiguration.baseUrl}/portal/manifest.webmanifest?${params}`});
  ensure("link",'link[rel="apple-touch-icon"]',{rel:"apple-touch-icon",href:`${apiConfiguration.baseUrl}/portal/icon.png?portal=${portal}&size=192&v=${data.version}`});
  ensure("link",'link[rel="icon"]',{rel:"icon",href:`${apiConfiguration.baseUrl}/portal/icon.png?portal=${portal}&size=192&v=${data.version}`});
  ensure("meta",'meta[name="theme-color"]',{name:"theme-color",content:branding?.background||"#e6f2e9"});ensure("meta",'meta[name="apple-mobile-web-app-title"]',{name:"apple-mobile-web-app-title",content:name});
 },[data]);
 useEffect(()=>{if(!("serviceWorker" in navigator))return;void registerWorker().catch(()=>{});const onMessage=(event:MessageEvent)=>{if(!authenticated||event.data?.type!=="ESS_PUSH"||typeof event.data.noticeId!=="string")return;dispatch(api.util.invalidateTags(["Notifications"]));void notice(event.data.noticeId,true).unwrap().then(showNoticeToast).catch(()=>{});};navigator.serviceWorker.addEventListener("message",onMessage);return()=>navigator.serviceWorker.removeEventListener("message",onMessage);},[authenticated,dispatch,notice]);
 return null;
}
