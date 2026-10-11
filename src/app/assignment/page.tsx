import {ProtectedPage} from '@/shared/protected-page';import {AssignmentPage} from '@/features/assignments/page';
export default function Page(){return <ProtectedPage><AssignmentPage/></ProtectedPage>;}
