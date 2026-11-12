import { CopyableId } from '../ui/CopyableId'
export function QuestionId(props: { code: string; short?: boolean; compact?: boolean; vi: boolean }) {
 return <CopyableId {...props} entity={props.vi ? 'mã câu hỏi' : 'question ID'} />
}
