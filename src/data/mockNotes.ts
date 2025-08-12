import type { Note, Folder } from '@/types/note';

export const mockFolders: Folder[] = [
  {
    id: 'personal',
    name: 'Personal',
    color: '#3b82f6',
    createdAt: new Date('2024-01-01'),
    isDefault: false,
  },
  {
    id: 'work',
    name: 'Work',
    color: '#10b981',
    createdAt: new Date('2024-01-01'),
    isDefault: false,
  },
  {
    id: 'projects',
    name: 'Projects',
    color: '#f59e0b',
    createdAt: new Date('2024-01-01'),
    isDefault: false,
  },
  {
    id: 'learning',
    name: 'Learning',
    color: '#8b5cf6',
    createdAt: new Date('2024-01-01'),
    isDefault: false,
  },
];

export const mockNotes: Note[] = [
  {
    id: '1',
    title: 'Welcome to Notes',
    content:
      'This is your first note! Start writing your thoughts here...\n\nYou can:\n- Create new notes\n- Star important ones\n- Search through your content\n- Organize with folders and tags',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    starred: true,
    tags: ['welcome', 'getting-started'],
    folderId: 'personal',
  },
  {
    id: '2',
    title: 'Project Ideas',
    content:
      'Some ideas for future projects:\n\n- Notes app with AI integration\n- Task manager with time tracking\n- Habit tracker with analytics\n- Personal finance dashboard\n- Recipe organizer\n\nRemember to prioritize based on impact and effort!',
    createdAt: new Date('2024-01-14'),
    updatedAt: new Date('2024-01-16'),
    starred: false,
    tags: ['projects', 'ideas', 'brainstorming'],
    folderId: 'projects',
  },
  {
    id: '3',
    title: 'Meeting Notes - Team Sync',
    content:
      "Key points from today's meeting:\n\n## Agenda\n- Q1 goals discussion\n- New feature roadmap review\n- Budget planning for next quarter\n\n## Action Items\n- [ ] Finalize Q1 OKRs by Friday\n- [ ] Review technical specifications\n- [ ] Schedule follow-up with stakeholders\n\n## Next Meeting\nScheduled for next Tuesday at 2 PM",
    createdAt: new Date('2024-01-13'),
    updatedAt: new Date('2024-01-13'),
    starred: false,
    tags: ['meetings', 'team'],
    folderId: 'work',
  },
  {
    id: '4',
    title: 'Learning Resources',
    content:
      "Great resources I've found:\n\n## React\n- React docs (new beta docs are excellent)\n- Kent C. Dodds blog\n- Epic React course\n\n## TypeScript\n- TypeScript handbook\n- Total TypeScript by Matt Pocock\n\n## Design\n- Refactoring UI\n- Design Systems handbook\n\nBookmark for later reference!",
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-14'),
    starred: true,
    tags: ['learning', 'resources', 'development'],
    folderId: 'learning',
  },
  {
    id: '5',
    title: 'Weekend Plans',
    content:
      'Things to do this weekend:\n\n- Visit the farmer\'s market\n- Read "Atomic Habits"\n- Call mom and dad\n- Organize digital photos\n- Try that new coffee shop downtown\n\nMaybe catch a movie if time permits!',
    createdAt: new Date('2024-01-11'),
    updatedAt: new Date('2024-01-12'),
    starred: false,
    tags: ['personal', 'weekend'],
    folderId: 'personal',
  },
  {
    id: '6',
    title: 'API Design Guidelines',
    content:
      'Best practices for REST API design:\n\n## Naming Conventions\n- Use nouns, not verbs\n- Use plural nouns for collections\n- Be consistent with case (kebab-case for URLs)\n\n## HTTP Methods\n- GET: Retrieve data\n- POST: Create new resources\n- PUT: Update entire resource\n- PATCH: Partial updates\n- DELETE: Remove resources\n\n## Status Codes\n- 200: Success\n- 201: Created\n- 400: Bad Request\n- 401: Unauthorized\n- 404: Not Found\n- 500: Internal Server Error',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-11'),
    starred: true,
    tags: ['api', 'development', 'guidelines'],
    folderId: 'work',
  },
];
