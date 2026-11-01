import type { LearningLesson } from '../../api/moduleAuthoringApi'
import { useTranslation } from '../../i18n/LanguageContext'
import { Card, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Heading } from '../typography/Heading'
import { LessonBody } from './LessonBody'
import { LessonVideo } from './LessonVideo'

/** Read-only ordered lessons for version review and content previews. */
export function LearningLessonList({
  lessons = [],
  headingLevel = 3,
}: {
  lessons?: LearningLesson[]
  headingLevel?: 3 | 4
}) {
  const { language } = useTranslation()
  const vi = language === 'vi'
  if (!lessons.length)
    return (
      <p className="rounded-lg border border-border bg-muted p-3 text-muted-foreground">
        {vi ? 'Phiên bản này chưa có bài học.' : 'No lessons in this version.'}
      </p>
    )
  return (
    <div
      className="space-y-4"
      aria-label={vi ? 'Danh sách bài học' : 'Lessons'}
    >
      {lessons.map((lesson, index) => {
        const label = `${vi ? 'Bài học' : 'Lesson'} ${index + 1}: ${lesson.title || (vi ? 'Chưa có tiêu đề' : 'Untitled')}`
        return (
          <section key={lesson.id} aria-label={label}>
            <Card>
              <CardContent className="space-y-3 pt-4">
                <div className="space-y-2 border-b border-border pb-3">
                  <Heading
                    level={headingLevel}
                    size="card"
                    className="break-words"
                  >
                    {label}
                  </Heading>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {lesson.type === 'TEXT'
                        ? vi
                          ? 'Bài đọc'
                          : 'Reading'
                        : 'Video'}
                    </Badge>
                    <span className="text-caption text-muted-foreground">
                      {lesson.durationSeconds > 0
                        ? `${Math.max(1, Math.ceil(lesson.durationSeconds / 60))} ${vi ? 'phút' : 'min'}`
                        : vi
                          ? 'Chưa có thời lượng'
                          : 'Duration not set'}
                    </span>
                  </div>
                </div>
                {lesson.type === 'TEXT' ? (
                  <LessonBody
                    body={lesson.body ?? ''}
                    format={lesson.bodyFormat ?? 'MARKDOWN'}
                  />
                ) : (
                  <LessonVideo lesson={lesson} />
                )}
              </CardContent>
            </Card>
          </section>
        )
      })}
    </div>
  )
}
