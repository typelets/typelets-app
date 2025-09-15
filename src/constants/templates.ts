export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  title: string;
  content: string;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Note',
    description: 'Start with a clean slate',
    title: 'Untitled Note',
    content: '',
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Structured template for meetings',
    title: 'Meeting Notes - [Date]',
    content: `<h1>Meeting: [Title]</h1><p><strong>Date:</strong> ${new Date().toLocaleDateString()}<br><strong>Attendees:</strong></p><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li></ul><h2>Agenda</h2><ol><li><p></p></li><li><p></p></li><li><p></p></li></ol><h2>Discussion</h2><p></p><h2>Action Items</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Task 1 - @person - Due: [date]</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Task 2 - @person - Due: [date]</p></div></li></ul><h2>Next Steps</h2><p></p>`,
  },
  {
    id: 'project-plan',
    name: 'Project Plan',
    description: 'Plan and track project progress',
    title: 'Project: [Name]',
    content: `<h1>Project: [Name]</h1><h2>Overview</h2><p>Brief description of the project...</p><h2>Goals &amp; Objectives</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Primary goal 1</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Primary goal 2</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Secondary goal 1</p></div></li></ul><h2>Timeline</h2><table><tbody><tr><th><p>Phase</p></th><th><p>Start Date</p></th><th><p>End Date</p></th><th><p>Status</p></th></tr><tr><td><p>Planning</p></td><td><p></p></td><td><p></p></td><td><p>⏳ Planned</p></td></tr><tr><td><p>Development</p></td><td><p></p></td><td><p></p></td><td><p>⏳ Planned</p></td></tr><tr><td><p>Testing</p></td><td><p></p></td><td><p></p></td><td><p>⏳ Planned</p></td></tr><tr><td><p>Launch</p></td><td><p></p></td><td><p></p></td><td><p>⏳ Planned</p></td></tr></tbody></table><h2>Resources</h2><ul><li><p><strong>Budget:</strong></p></li><li><p><strong>Team Members:</strong></p></li><li><p><strong>Tools/Software:</strong></p></li></ul><h2>Risks &amp; Mitigation</h2><ul><li><p><strong>Risk 1:</strong><br><em>Mitigation:</em></p></li><li><p><strong>Risk 2:</strong><br><em>Mitigation:</em></p></li></ul><h2>Next Actions</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Action item 1</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Action item 2</p></div></li></ul>`,
  },
  {
    id: 'daily-notes',
    name: 'Daily Notes',
    description: 'Daily journal and task tracking',
    title: `Daily Notes - ${new Date().toLocaleDateString()}`,
    content: `<h1>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h1><h2>Today's Focus</h2><p><em>What are the 3 most important things to accomplish today?</em></p><ol><li><p></p></li><li><p></p></li><li><p></p></li></ol><h2>Tasks</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li></ul><h2>Notes &amp; Thoughts</h2><p></p><h2>Wins &amp; Progress</h2><ul><li><p></p></li><li><p></p></li></ul><h2>Tomorrow's Priorities</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li></ul>`,
  },
  {
    id: 'research-notes',
    name: 'Research Notes',
    description: 'Structured research documentation',
    title: 'Research: [Topic]',
    content: `<h1>Research: [Topic]</h1><h2>Research Question</h2><p><em>What am I trying to find out?</em></p><p></p><h2>Sources</h2><ul><li><p></p></li><li><p></p></li><li><p></p></li></ul><h2>Key Findings</h2><h3>Finding 1</h3><p></p><h3>Finding 2</h3><p></p><h3>Finding 3</h3><p></p><h2>Summary &amp; Conclusions</h2><p></p><h2>Next Steps</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li></ul><hr><p><em>Research conducted on: ${new Date().toLocaleDateString()}</em></p>`,
  },
  {
    id: 'password-entry',
    name: 'Password Entry',
    description: 'Secure template for storing credentials',
    title: '🔐 Password Entry',
    content: `<h1>🔐 Password Entry</h1><p><strong>Service/Website:</strong> [Enter service name]<br><strong>Username/Email:</strong> [Enter username or email]<br><strong>Password:</strong> [Enter password - this note is encrypted]<br><strong>URL:</strong> [Enter website URL]</p><h2>Additional Information</h2><ul><li><p><strong>Security Questions:</strong><br>Q: [Question 1]<br>A: [Answer 1]</p></li><li><p><strong>Backup Codes:</strong> [Enter backup codes if any]</p></li><li><p><strong>Notes:</strong> [Any additional notes]</p></li></ul><h2>Recovery Information</h2><ul><li><p><strong>Recovery Email:</strong> [Recovery email if different]</p></li><li><p><strong>Recovery Phone:</strong> [Recovery phone number]</p></li></ul><hr><p><em>Last Updated: ${new Date().toLocaleDateString()}</em><br><em>Created: ${new Date().toLocaleDateString()}</em></p>`,
  },
];
