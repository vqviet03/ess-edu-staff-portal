import test from "node:test";
import assert from "node:assert/strict";
import {applyPresence,memberOnline,offlineLabel,type PresenceState} from "../src/features/presence/state";
test("presence tracks multiple visible sockets; hidden sockets leave without DB polling",()=>{
 const state:PresenceState={connections:{},lastSeen:{},connected:true};
 const event={classId:"c",userId:"u",connectionId:"a",online:true,seenAt:"2026-10-10T10:00:00Z"};
 applyPresence(state,event);applyPresence(state,{...event,connectionId:"b"});assert.equal(memberOnline(state,"u"),true);
 applyPresence(state,{...event,online:false});assert.equal(memberOnline(state,"u"),true);
 applyPresence(state,{...event,connectionId:"b",online:false});assert.equal(memberOnline(state,"u"),false);assert.equal(state.lastSeen.u,event.seenAt);
});
test("offline age is calculated on render, without an interval",()=>{
 assert.equal(offlineLabel("2026-10-10T10:00:00Z",Date.parse("2026-10-10T10:04:00Z")),"Offline 4 phút");
 assert.equal(offlineLabel(null),"Chưa có hoạt động gần đây");
});
