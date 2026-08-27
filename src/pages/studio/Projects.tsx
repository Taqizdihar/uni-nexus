import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ActiveProjectsPage } from './projects/ActiveProjectsPage';
import { ProjectCreatePage } from './projects/ProjectCreatePage';
import { ProjectDetailPage } from './projects/ProjectDetailPage';
import { ProjectEditPage } from './projects/ProjectEditPage';
import { ProjectMilestonesPage } from './projects/ProjectMilestonesPage';
import { ProjectsListPage } from './projects/ProjectsListPage';

/** Static routes are declared before `:id` so they are never swallowed as a project ID. */
export function StudioProjects() {
  return (
    <Routes>
      <Route index element={<ProjectsListPage />} />
      <Route path="active" element={<ActiveProjectsPage />} />
      <Route path="new" element={<ProjectCreatePage />} />
      <Route path="milestones" element={<ProjectMilestonesPage />} />
      <Route path=":id/edit" element={<ProjectEditPage />} />
      <Route path=":id" element={<ProjectDetailPage />} />
    </Routes>
  );
}
