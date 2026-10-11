import {test} from "node:test";
import assert from "node:assert/strict";
import {profileError,avatarColors,avatarIcons,type PersonalProfile} from "../src/features/profile/models";
const profile:PersonalProfile={loginId:"hv.bon",fullName:"Hữu Văn",nickname:"Bon",dateOfBirth:null,email:"bon@example.com",phone:"0912345678",parentPhone:"",parentName:"",avatar:{fileId:null,icon:"pets",color:avatarColors[0]},version:1};
test("profile validates optional contacts and custom login ID",()=>{assert.equal(profileError(profile),"");assert.equal(profileError({...profile,email:"",phone:""}),"");assert.notEqual(profileError({...profile,email:"invalid"}),"");assert.notEqual(profileError({...profile,loginId:"wrong id"}),"");assert.notEqual(profileError({...profile,phone:"123"}),"");});
test("avatar choices require no file or network",()=>{assert.ok(avatarIcons.includes("pets"));assert.equal(avatarColors.length,6);});
