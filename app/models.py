from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base
from .security import decrypt_text, encrypt_text


class Person(Base):
    __tablename__ = "people"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    external_id: Mapped[str | None] = mapped_column(String(80), index=True, nullable=True)
    full_name: Mapped[str] = mapped_column(String(200), index=True)
    email: Mapped[str | None] = mapped_column(String(320), unique=True, index=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    roster_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    talent_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    termination_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    termination_end_reason: Mapped[str | None] = mapped_column(String(120), nullable=True)
    termination_recorded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    employment_prior_assignment: Mapped[str | None] = mapped_column(String(200), nullable=True)
    employment_initial_hire_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    employment_prior_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    employment_prior_job_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    employment_recorded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    legacy_date_of_birth: Mapped[date | None] = mapped_column("date_of_birth", Date, nullable=True)
    legacy_social_security_number: Mapped[str | None] = mapped_column("social_security_number", String(20), nullable=True)
    personal_recorded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    legacy_direct_deposit_json: Mapped[str | None] = mapped_column("direct_deposit_json", Text, nullable=True)
    date_of_birth_encrypted: Mapped[str | None] = mapped_column("date_of_birth_encrypted", Text, nullable=True)
    social_security_number_encrypted: Mapped[str | None] = mapped_column(
        "social_security_number_encrypted", Text, nullable=True
    )
    direct_deposit_json_encrypted: Mapped[str | None] = mapped_column("direct_deposit_json_encrypted", Text, nullable=True)
    emergency_contacts_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    attendance: Mapped[list["Attendance"]] = relationship(back_populates="person", cascade="all, delete-orphan")
    onboarding_documents: Mapped[list["PersonOnboardingDocument"]] = relationship(
        back_populates="person", cascade="all, delete-orphan"
    )
    employment_archives: Mapped[list["EmploymentAssignmentArchive"]] = relationship(
        back_populates="person", cascade="all, delete-orphan"
    )
    project_assignments: Mapped[list["ProjectMember"]] = relationship(
        back_populates="person", cascade="all, delete-orphan"
    )

    @property
    def date_of_birth(self) -> date | None:
        raw = decrypt_text(self.date_of_birth_encrypted)
        if raw:
            try:
                return date.fromisoformat(raw[:10])
            except ValueError:
                return None
        return self.legacy_date_of_birth

    @date_of_birth.setter
    def date_of_birth(self, value: date | None) -> None:
        self.date_of_birth_encrypted = encrypt_text(value.isoformat()) if value else None
        self.legacy_date_of_birth = None

    @property
    def social_security_number(self) -> str | None:
        return decrypt_text(self.social_security_number_encrypted) or self.legacy_social_security_number

    @social_security_number.setter
    def social_security_number(self, value: str | None) -> None:
        self.social_security_number_encrypted = encrypt_text(value)
        self.legacy_social_security_number = None

    @property
    def direct_deposit_json(self) -> str | None:
        return decrypt_text(self.direct_deposit_json_encrypted) or self.legacy_direct_deposit_json

    @direct_deposit_json.setter
    def direct_deposit_json(self, value: str | None) -> None:
        self.direct_deposit_json_encrypted = encrypt_text(value)
        self.legacy_direct_deposit_json = None


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (UniqueConstraint("person_id", "attended_on", name="uq_attendance_person_day"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), index=True)
    attended_on: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(40), default="present")
    source_filename: Mapped[str | None] = mapped_column(String(260), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    person: Mapped[Person] = relationship(back_populates="attendance")


class PersonOnboardingDocument(Base):
    __tablename__ = "person_onboarding_documents"
    __table_args__ = (Index("ix_onboarding_docs_person_uploaded", "person_id", "uploaded_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), index=True)
    original_filename: Mapped[str] = mapped_column(String(300))
    stored_filename: Mapped[str] = mapped_column(String(120), unique=True)
    content_type: Mapped[str | None] = mapped_column(String(200), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    person: Mapped[Person] = relationship(back_populates="onboarding_documents")


class EmploymentAssignmentArchive(Base):
    """Snapshot of employment/termination fields when a terminated person is re-hired."""

    __tablename__ = "employment_assignment_archive"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), index=True)
    prior_assignment: Mapped[str | None] = mapped_column(String(200), nullable=True)
    initial_hire_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    assignment_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    job_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    termination_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    termination_end_reason: Mapped[str | None] = mapped_column(String(120), nullable=True)
    archived_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    person: Mapped[Person] = relationship(back_populates="employment_archives")


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    filename: Mapped[str] = mapped_column(String(260))
    imported_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    rows_total: Mapped[int] = mapped_column(Integer, default=0)
    rows_created: Mapped[int] = mapped_column(Integer, default=0)
    rows_updated: Mapped[int] = mapped_column(Integer, default=0)
    rows_skipped: Mapped[int] = mapped_column(Integer, default=0)
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    client_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="planning", index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    memberships: Mapped[list["ProjectMember"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    participants: Mapped[list["ProjectParticipant"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    departments: Mapped[list["ProjectDepartment"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    tasks: Mapped[list["ProjectTask"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class ProjectMember(Base):
    __tablename__ = "project_members"
    __table_args__ = (UniqueConstraint("project_id", "person_id", name="uq_project_members_project_person"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    project: Mapped[Project] = relationship(back_populates="memberships")
    person: Mapped[Person] = relationship(back_populates="project_assignments")


class ProjectParticipant(Base):
    __tablename__ = "project_participants"
    __table_args__ = (UniqueConstraint("project_id", "display_name", name="uq_project_participants_project_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    display_name: Mapped[str] = mapped_column(String(200), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    project: Mapped[Project] = relationship(back_populates="participants")
    planner_entries: Mapped[list["PlannerEntry"]] = relationship(back_populates="participant", cascade="all, delete-orphan")
    owned_tasks: Mapped[list["ProjectTask"]] = relationship(back_populates="owner")
    supported_task_links: Mapped[list["ProjectTaskSupporter"]] = relationship(
        back_populates="participant", cascade="all, delete-orphan"
    )


class ProjectDepartment(Base):
    """Project workstream or department used to group larger-project work."""

    __tablename__ = "project_departments"
    __table_args__ = (
        UniqueConstraint("project_id", "name", name="uq_project_departments_project_name"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    color: Mapped[str] = mapped_column(String(40), default="slate")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    project: Mapped[Project] = relationship(back_populates="departments")
    tasks: Mapped[list["ProjectTask"]] = relationship(back_populates="department")


class ProjectTask(Base):
    """Structured work item for project management views."""

    __tablename__ = "project_tasks"
    __table_args__ = (
        Index("ix_project_tasks_project_status_due", "project_id", "status", "due_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("project_departments.id", ondelete="SET NULL"), index=True, nullable=True
    )
    owner_participant_id: Mapped[int | None] = mapped_column(
        ForeignKey("project_participants.id", ondelete="SET NULL"), index=True, nullable=True
    )
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="todo", index=True)
    priority: Mapped[str] = mapped_column(String(40), default="medium", index=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    percent_complete: Mapped[int] = mapped_column(Integer, default=0)
    dependency_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    risk_level: Mapped[str] = mapped_column(String(40), default="low", index=True)
    risk_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    project: Mapped[Project] = relationship(back_populates="tasks")
    department: Mapped[ProjectDepartment | None] = relationship(back_populates="tasks")
    owner: Mapped[ProjectParticipant | None] = relationship(back_populates="owned_tasks")
    supporter_links: Mapped[list["ProjectTaskSupporter"]] = relationship(
        back_populates="task", cascade="all, delete-orphan"
    )
    notes: Mapped[list["ProjectTaskNote"]] = relationship(
        back_populates="task", cascade="all, delete-orphan"
    )


class ProjectTaskSupporter(Base):
    """Many-to-many helper list for task supporters."""

    __tablename__ = "project_task_supporters"
    __table_args__ = (
        UniqueConstraint("task_id", "participant_id", name="uq_project_task_supporters_task_participant"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("project_tasks.id", ondelete="CASCADE"), index=True)
    participant_id: Mapped[int] = mapped_column(ForeignKey("project_participants.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    task: Mapped[ProjectTask] = relationship(back_populates="supporter_links")
    participant: Mapped[ProjectParticipant] = relationship(back_populates="supported_task_links")


class ProjectTaskNote(Base):
    """Notebook-style notes attached directly to a project task."""

    __tablename__ = "project_task_notes"
    __table_args__ = (
        Index("ix_project_task_notes_task_created", "task_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("project_tasks.id", ondelete="CASCADE"), index=True)
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("project_task_notes.id", ondelete="CASCADE"), index=True, nullable=True
    )
    is_section: Mapped[bool] = mapped_column(Boolean, default=False)
    note_type: Mapped[str] = mapped_column(String(40), default="general", index=True)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    content: Mapped[str] = mapped_column(Text, default="")
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    author_label: Mapped[str | None] = mapped_column(String(200), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    task: Mapped[ProjectTask] = relationship(back_populates="notes")
    children: Mapped[list["ProjectTaskNote"]] = relationship(
        "ProjectTaskNote", backref="parent", remote_side=[id], cascade="all, delete-orphan", single_parent=True
    )


class PlannerEntry(Base):
    """OneNote-style planner notes for a project participant."""
    __tablename__ = "planner_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    participant_id: Mapped[int] = mapped_column(ForeignKey("project_participants.id", ondelete="CASCADE"), index=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("planner_entries.id", ondelete="CASCADE"), index=True, nullable=True)
    is_section: Mapped[bool] = mapped_column(Boolean, default=False)
    title: Mapped[str] = mapped_column(String(300))
    content: Mapped[str] = mapped_column(Text, default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    participant: Mapped[ProjectParticipant] = relationship(back_populates="planner_entries")
    children: Mapped[list["PlannerEntry"]] = relationship(
        "PlannerEntry", backref="parent", remote_side=[id], cascade="all, delete-orphan", single_parent=True
    )


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    import_batch_id: Mapped[int] = mapped_column(ForeignKey("import_batches.id", ondelete="CASCADE"), index=True)
    source_kind: Mapped[str] = mapped_column(String(20), index=True)  # "paid_billed" or "mim"

    external_timesheet_id: Mapped[str] = mapped_column(String(120), index=True)
    pay_type: Mapped[str] = mapped_column(String(80), index=True)
    employee_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    company_name: Mapped[str | None] = mapped_column(String(200), index=True, nullable=True)
    invoice_number: Mapped[str | None] = mapped_column(String(120), nullable=True)

    pay_rate: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)
    bill_rate: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)
    quantity: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    total_amount: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    week_ended_on: Mapped[date | None] = mapped_column(Date, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class InvoicePayTypeMapping(Base):
    __tablename__ = "invoice_pay_type_mappings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_value: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    target_value: Mapped[str] = mapped_column(String(120), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class InvoiceSetting(Base):
    __tablename__ = "invoice_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    value: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class InvoiceSettingsPreset(Base):
    """Full custom-settings snapshot (tolerance, company filter, all pay-type mappings) for invoice crossreference."""

    __tablename__ = "invoice_settings_presets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    payload_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class InvoiceCrossrefSnapshot(Base):
    """Cached crossreference table rows (built on demand via Calculate); cleared when imports or settings change."""

    __tablename__ = "invoice_crossref_snapshot"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    payload_json: Mapped[str] = mapped_column(Text)
    tolerance_value: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class InvoiceCrossrefRowNote(Base):
    """Per–cross-ref row note + solved flag (keyed by normalized VMS ID + pay type)."""

    __tablename__ = "invoice_crossref_row_notes"

    row_key: Mapped[str] = mapped_column(String(500), primary_key=True)
    note: Mapped[str] = mapped_column(Text, default="")
    solved: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class PpeDeductionLine(Base):
    __tablename__ = "ppe_deduction_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    import_batch_id: Mapped[int] = mapped_column(ForeignKey("import_batches.id", ondelete="CASCADE"), index=True)
    external_timesheet_id: Mapped[str] = mapped_column(String(120), index=True)
    employee_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    deduction_amount: Mapped[float] = mapped_column(Numeric(14, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class AdminProfile(Base):
    """Singleton row (id=1): local operator / admin contact info for this install."""

    __tablename__ = "admin_profile"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class AppUser(Base):
    __tablename__ = "app_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    full_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    role_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(400))
    permissions_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    person_id: Mapped[int | None] = mapped_column(
        ForeignKey("people.id", ondelete="SET NULL"), index=True, nullable=True
    )
    project_manager_person_id: Mapped[int | None] = mapped_column(
        ForeignKey("people.id", ondelete="SET NULL"), index=True, nullable=True
    )
