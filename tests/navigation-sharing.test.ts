import {test} from "node:test";
import assert from "node:assert/strict";
import {safeReturnTo,loginDestination,loginRedirect} from "../src/shared/auth-navigation";
import {postShareUrl} from "../src/features/materials/share-links";
test("login keeps the full internal target, query and comment fragment with Pages basePath",()=>{
 const target="/portal/post/?postId=p%26q&classId=class-one&commentId=c#comment-c";
 assert.equal(safeReturnTo(target,"/portal"),target.slice(7));
 assert.equal(loginDestination(new URL(loginRedirect(target,"/portal"),"https://portal.test").search,"/portal"),target.slice(7));
 assert.equal(loginDestination("?next=%2Fassignment%2F%3FassignmentId%3Da%26classId%3Dc"),"/assignment/?assignmentId=a&classId=c");
});
test("login refuses external, encoded, control-character and auth-loop redirect targets",()=>{
 for(const value of ["https://evil.test","//evil.test","/%2fevil.test","/a/..//evil.test","/\\evil.test","/%5cevil.test","/login/?next=/post/","/%6cogin/","/auth/link/#code=x","/activate/","/portal/login/","/x%00",null]) assert.equal(safeReturnTo(value,"/portal"),null,String(value));
 assert.equal(loginDestination("?next=https://evil.test"),"/home/");assert.equal(loginDestination(""),"/home/");
});
test("student and staff links address the same post using their own host and static basePath",()=>{
 const post={id:"p&name",classId:"class 1"};
 const student=new URL(postShareUrl(post,"https://eeslern.com")),staff=new URL(postShareUrl(post,"https://staff.eeslern.com/staff/"));
 assert.equal(student.origin,"https://eeslern.com");assert.equal(student.pathname,"/post/");assert.equal(staff.pathname,"/staff/post/");
 assert.equal(student.searchParams.get("postId"),post.id);assert.equal(staff.searchParams.get("classId"),post.classId);
 assert.equal(new URL(postShareUrl(post,"http://localhost:3030/portal")).pathname,"/portal/post/");
});
test("sharing rejects unsafe or credential-bearing portal configuration",()=>{
 for(const url of ["javascript:alert(1)","http://external.test","https://user:password@portal.test","https://portal.test/?token=private","https://portal.test/#private"]) assert.throws(()=>postShareUrl({id:"p",classId:"c"},url));
});
