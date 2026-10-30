import { Fragment } from 'react';
import Link from 'next/link';
import { PREP_PAGE_CONTENT, type PrepInline } from '@/lib/prepPageContent';
import styles from './prep-page.module.css';

function ExternalIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      focusable="false"
      className={styles.externalIcon}
    >
      <path
        d="M21 3L15 3M21 3L12 12M21 3V9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 13V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H11"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InlineText({ parts }: { parts: PrepInline[] }) {
  return parts.map((part, index) => {
    if (typeof part === 'string') return part;
    if ('strong' in part) return <strong key={index}>{part.strong}</strong>;
    if (part.href.startsWith('/')) {
      return (
        <Link key={index} href={part.href}>
          {part.text}
        </Link>
      );
    }
    const lastSpace = part.text.lastIndexOf(' ');
    return (
      <a key={index} href={part.href} target="_blank" rel="noopener noreferrer">
        {part.text.slice(0, lastSpace + 1)}
        <span className={styles.linkEnd}>
          {part.text.slice(lastSpace + 1)}
          <ExternalIcon />
        </span>
        <span className="sr-only" data-prep-new-tab>
          {' '}
          (נפתח בכרטיסייה חדשה)
        </span>
      </a>
    );
  });
}

function ContentList({ items }: { items: PrepInline[][] }) {
  return (
    <ul>
      {items.map((item, index) => (
        <Fragment key={index}>
          {index > 0 ? ' ' : null}
          <li>
            <InlineText parts={item} />
          </li>
        </Fragment>
      ))}
    </ul>
  );
}

export default function PrepPageContent() {
  return (
    <section className={styles.content} data-prep-content dir="rtl">
      <div className={styles.text} data-prep-text>
        {PREP_PAGE_CONTENT.map((section) => (
          <Fragment key={section.heading}>
            <h2>{section.heading}</h2>
            {section.blocks.map((block, index) => (
              <Fragment key={index}>
                {index > 0 ? ' ' : null}
                {block.type === 'paragraph' ? (
                  <p>
                    <InlineText parts={block.text} />
                  </p>
                ) : block.type === 'list' ? (
                  <ContentList items={block.items} />
                ) : (
                  <div className={styles.listSentence}>
                    <span>
                      <InlineText parts={block.intro} />
                    </span>{' '}
                    <ContentList items={block.items} />{' '}
                    <span>
                      <InlineText parts={block.duration} />
                    </span>
                  </div>
                )}
              </Fragment>
            ))}
          </Fragment>
        ))}
      </div>
    </section>
  );
}
