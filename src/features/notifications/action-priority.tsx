"use client";
import {NotificationOptionsButton} from "./options-button";
import {NotificationPriorityForm} from "./priority";
export function NotificationActionPriority(props:Parameters<typeof NotificationPriorityForm>[0]){return <NotificationOptionsButton important={props.value==="IMPORTANT"}><NotificationPriorityForm {...props}/></NotificationOptionsButton>;}
