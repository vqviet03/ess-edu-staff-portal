export interface Viewer { publicId:string; name:string; role:string; viewedAt:string }
export interface Viewers { items:Viewer[]; total:number; page:number; pageSize:number }
