from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session


APP_DIR = Path(__file__).resolve().parent
DB_PATH = APP_DIR / "attendance.sqlite3"


class Base(DeclarativeBase):
    pass


engine = create_engine(f"sqlite:///{DB_PATH}", future=True)


def ensure_schema() -> None:
    Base.metadata.create_all(bind=engine)

    # Lightweight "add column if missing" for local SQLite dev.
    # (Avoids pulling in a full migration tool for this small app.)
    with engine.begin() as conn:
        cols = conn.execute(text("PRAGMA table_info(people)")).fetchall()
        if not cols:
            return
        existing = {row[1] for row in cols}  # (cid, name, type, notnull, dflt_value, pk)

        if "external_id" not in existing:
            conn.execute(text("ALTER TABLE people ADD COLUMN external_id VARCHAR(80)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_people_external_id ON people (external_id)"))
        if "phone" not in existing:
            conn.execute(text("ALTER TABLE people ADD COLUMN phone VARCHAR(40)"))
        if "roster_status" not in existing:
            conn.execute(text("ALTER TABLE people ADD COLUMN roster_status VARCHAR(40)"))
        if "talent_status" not in existing:
            conn.execute(text("ALTER TABLE people ADD COLUMN talent_status VARCHAR(40)"))
        if "termination_end_date" not in existing:
            conn.execute(text("ALTER TABLE people ADD COLUMN termination_end_date DATE"))
        if "termination_end_reason" not in existing:
            conn.execute(text("ALTER TABLE people ADD COLUMN termination_end_reason VARCHAR(120)"))
        if "termination_recorded_at" not in existing:
            conn.execute(text("ALTER TABLE people ADD COLUMN termination_recorded_at DATETIME"))
            conn.execute(
                text(
                    "UPDATE people SET termination_recorded_at = datetime('now') "
                    "WHERE talent_status = 'terminated' "
                    "AND (termination_end_date IS NOT NULL OR termination_end_reason IS NOT NULL)"
                )
            )
        if "employment_prior_assignment" not in existing:
            conn.execute(text("ALTER TABLE people ADD COLUMN employment_prior_assignment VARCHAR(200)"))
        if "employment_initial_hire_date" not in existing:
            conn.execute(text("ALTER TABLE people ADD COLUMN employment_initial_hire_date DATE"))
        if "employment_prior_end_date" not in existing:
            conn.execute(text("ALTER TABLE people ADD COLUMN employment_prior_end_date DATE"))
        if "employment_prior_job_title" not in existing:
            conn.execute(text("ALTER TABLE people ADD COLUMN employment_prior_job_title VARCHAR(200)"))
        if "employment_recorded_at" not in existing:
            conn.execute(text("ALTER TABLE people ADD COLUMN employment_recorded_at DATETIME"))
            conn.execute(
                text(
                    "UPDATE people SET employment_recorded_at = datetime('now') "
                    "WHERE employment_prior_assignment IS NOT NULL "
                    "OR employment_initial_hire_date IS NOT NULL "
                    "OR employment_prior_end_date IS NOT NULL "
                    "OR employment_prior_job_title IS NOT NULL"
                )
            )
        if "date_of_birth" not in existing:
            conn.execute(text("ALTER TABLE people ADD COLUMN date_of_birth DATE"))
        if "social_security_number" not in existing:
            conn.execute(text("ALTER TABLE people ADD COLUMN social_security_number VARCHAR(20)"))
        if "date_of_birth_encrypted" not in existing:
            conn.execute(text("ALTER TABLE people ADD COLUMN date_of_birth_encrypted TEXT"))
        if "social_security_number_encrypted" not in existing:
            conn.execute(text("ALTER TABLE people ADD COLUMN social_security_number_encrypted TEXT"))
        if "personal_recorded_at" not in existing:
            conn.execute(text("ALTER TABLE people ADD COLUMN personal_recorded_at DATETIME"))
        if "emergency_contacts_json" not in existing:
            conn.execute(text("ALTER TABLE people ADD COLUMN emergency_contacts_json TEXT"))
        if "direct_deposit_json" not in existing:
            conn.execute(text("ALTER TABLE people ADD COLUMN direct_deposit_json TEXT"))
        if "direct_deposit_json_encrypted" not in existing:
            conn.execute(text("ALTER TABLE people ADD COLUMN direct_deposit_json_encrypted TEXT"))

        invoice_cols = conn.execute(text("PRAGMA table_info(invoice_lines)")).fetchall()
        invoice_existing = {row[1] for row in invoice_cols} if invoice_cols else set()
        if invoice_cols and "company_name" not in invoice_existing:
            conn.execute(text("ALTER TABLE invoice_lines ADD COLUMN company_name VARCHAR(200)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_invoice_lines_company_name ON invoice_lines (company_name)"))
        if invoice_cols and "quantity" not in invoice_existing:
            conn.execute(text("ALTER TABLE invoice_lines ADD COLUMN quantity NUMERIC(12,2)"))
        if invoice_cols and "invoice_number" not in invoice_existing:
            conn.execute(text("ALTER TABLE invoice_lines ADD COLUMN invoice_number VARCHAR(120)"))
        if invoice_cols and "week_ended_on" not in invoice_existing:
            conn.execute(text("ALTER TABLE invoice_lines ADD COLUMN week_ended_on DATE"))

        user_cols = conn.execute(text("PRAGMA table_info(app_users)")).fetchall()
        user_existing = {row[1] for row in user_cols} if user_cols else set()
        if user_cols and "full_name" not in user_existing:
            conn.execute(text("ALTER TABLE app_users ADD COLUMN full_name VARCHAR(200)"))
        if user_cols and "role_name" not in user_existing:
            conn.execute(text("ALTER TABLE app_users ADD COLUMN role_name VARCHAR(120)"))
        if user_cols and "permissions_json" not in user_existing:
            conn.execute(text("ALTER TABLE app_users ADD COLUMN permissions_json TEXT"))
        if user_cols and "is_superuser" not in user_existing:
            conn.execute(text("ALTER TABLE app_users ADD COLUMN is_superuser BOOLEAN DEFAULT 0"))
        if user_cols and "project_manager_person_id" not in user_existing:
            conn.execute(text("ALTER TABLE app_users ADD COLUMN project_manager_person_id INTEGER REFERENCES people(id) ON DELETE SET NULL"))
        if user_cols and "person_id" not in user_existing:
            conn.execute(text("ALTER TABLE app_users ADD COLUMN person_id INTEGER REFERENCES people(id) ON DELETE SET NULL"))

        # Planner entries table - add missing columns if table exists
        planner_cols = conn.execute(text("PRAGMA table_info(planner_entries)")).fetchall()
        if planner_cols:
            planner_existing = {row[1] for row in planner_cols}
            if "parent_id" not in planner_existing:
                conn.execute(text("ALTER TABLE planner_entries ADD COLUMN parent_id INTEGER REFERENCES planner_entries(id) ON DELETE CASCADE"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_planner_entries_parent_id ON planner_entries (parent_id)"))
            if "is_section" not in planner_existing:
                conn.execute(text("ALTER TABLE planner_entries ADD COLUMN is_section BOOLEAN DEFAULT 0"))

        project_task_cols = conn.execute(text("PRAGMA table_info(project_tasks)")).fetchall()
        project_task_existing = {row[1] for row in project_task_cols} if project_task_cols else set()
        if project_task_cols and "department_id" not in project_task_existing:
            conn.execute(text("ALTER TABLE project_tasks ADD COLUMN department_id INTEGER REFERENCES project_departments(id) ON DELETE SET NULL"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_project_tasks_department_id ON project_tasks (department_id)"))

        task_note_cols = conn.execute(text("PRAGMA table_info(project_task_notes)")).fetchall()
        task_note_existing = {row[1] for row in task_note_cols} if task_note_cols else set()
        if task_note_cols and "parent_id" not in task_note_existing:
            conn.execute(text("ALTER TABLE project_task_notes ADD COLUMN parent_id INTEGER REFERENCES project_task_notes(id) ON DELETE CASCADE"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_project_task_notes_parent_id ON project_task_notes (parent_id)"))
        if task_note_cols and "is_section" not in task_note_existing:
            conn.execute(text("ALTER TABLE project_task_notes ADD COLUMN is_section BOOLEAN DEFAULT 0"))
        if task_note_cols and "sort_order" not in task_note_existing:
            conn.execute(text("ALTER TABLE project_task_notes ADD COLUMN sort_order INTEGER DEFAULT 0"))


@contextmanager
def session_scope() -> Session:
    with Session(engine) as session:
        yield session
