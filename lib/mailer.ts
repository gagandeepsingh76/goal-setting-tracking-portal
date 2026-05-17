import nodemailer from "nodemailer";

const isConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })
  : null;

type MailUser = {
  name: string;
  email: string;
};

function resolveUserEmail(userOrEmail: MailUser | string): string {
  return typeof userOrEmail === "string" ? userOrEmail : userOrEmail.email;
}

function resolveUserName(userOrName: MailUser | string): string {
  return typeof userOrName === "string" ? userOrName : userOrName.name;
}

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) {
    console.log("[MAILER FALLBACK] To:", to, "| Subject:", subject);
    console.log("[MAILER FALLBACK] Body:", html.replace(/<[^>]+>/g, ""));
    return;
  }
  try {
    await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, html });
  } catch (err) {
    console.error("[MAILER ERROR]", err);
  }
}

function baseTemplate(title: string, body: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
      <div style="background:#1e40af;padding:20px 24px">
        <h1 style="color:#fff;margin:0;font-size:18px">Goal Setting & Tracking Portal</h1>
      </div>
      <div style="padding:24px">
        <h2 style="color:#111827;font-size:16px;margin-top:0">${title}</h2>
        ${body}
      </div>
      <div style="background:#f9fafb;padding:12px 24px;font-size:12px;color:#6b7280">
        This is an automated notification. Do not reply to this email.
      </div>
    </div>`;
}

const portalUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

export async function sendGoalSubmittedEmail(
  managerEmailOrUser: string | MailUser,
  managerNameOrEmployee: string | MailUser,
  employeeNameOrCycleYear: string | number,
  cycleYearOrSheetId: string | number,
  maybeSheetId?: string
) {
  const managerEmail = resolveUserEmail(managerEmailOrUser);
  const managerName = typeof managerEmailOrUser === "string" ? String(managerNameOrEmployee) : managerEmailOrUser.name;
  const employeeName =
    typeof managerNameOrEmployee === "string" ? String(employeeNameOrCycleYear) : managerNameOrEmployee.name;
  const cycleYear = String(typeof managerNameOrEmployee === "string" ? cycleYearOrSheetId : employeeNameOrCycleYear);
  const sheetId = String(maybeSheetId ?? cycleYearOrSheetId);
  const link = `${portalUrl}/approvals/${sheetId}`;
  await sendMail(
    managerEmail,
    `Goals Submitted by ${employeeName}`,
    baseTemplate(
      `${employeeName} has submitted their goals`,
      `<p>Hi ${managerName},</p>
       <p><strong>${employeeName}</strong> has submitted their goals for <strong>${cycleYear}</strong> and is awaiting your approval.</p>
       <a href="${link}" style="display:inline-block;background:#1e40af;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">Review Goals -></a>`
    )
  );
}

export async function sendGoalApprovedEmail(
  employeeEmailOrUser: string | MailUser,
  employeeNameOrCycleYear: string | number,
  maybeCycleYear?: string | number
) {
  const employeeEmail = resolveUserEmail(employeeEmailOrUser);
  const employeeName = typeof employeeEmailOrUser === "string" ? String(employeeNameOrCycleYear) : employeeEmailOrUser.name;
  const cycleYear = String(maybeCycleYear ?? employeeNameOrCycleYear);
  const link = `${portalUrl}/goals`;
  await sendMail(
    employeeEmail,
    `Your Goals for ${cycleYear} Have Been Approved`,
    baseTemplate(
      "Goals Approved",
      `<p>Hi ${employeeName},</p>
       <p>Your goals for <strong>${cycleYear}</strong> have been reviewed and <strong>approved</strong> by your manager. They are now locked.</p>
       <a href="${link}" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">View My Goals -></a>`
    )
  );
}

export async function sendGoalReturnedEmail(
  employeeEmailOrUser: string | MailUser,
  employeeNameOrCycleYear: string | number,
  cycleYearOrComment: string | number,
  maybeManagerComment?: string
) {
  const employeeEmail = resolveUserEmail(employeeEmailOrUser);
  const employeeName = typeof employeeEmailOrUser === "string" ? String(employeeNameOrCycleYear) : employeeEmailOrUser.name;
  const cycleYear = String(typeof employeeEmailOrUser === "string" ? cycleYearOrComment : employeeNameOrCycleYear);
  const managerComment = String(maybeManagerComment ?? cycleYearOrComment);
  const link = `${portalUrl}/goals`;
  await sendMail(
    employeeEmail,
    "Your Goals Have Been Returned for Rework",
    baseTemplate(
      "Goals Returned",
      `<p>Hi ${employeeName},</p>
       <p>Your goals for <strong>${cycleYear}</strong> have been returned for rework by your manager.</p>
       <div style="background:#fef9c3;border-left:4px solid #eab308;padding:12px 16px;margin:16px 0;border-radius:4px">
         <strong>Manager's Comment:</strong><br/>${managerComment}
       </div>
       <a href="${link}" style="display:inline-block;background:#d97706;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">Update My Goals -></a>`
    )
  );
}

export async function sendSharedGoalPushedEmail(
  employeeEmailOrUser: string | MailUser,
  employeeNameOrGoalTitle: string,
  goalTitleOrCycleYear: string | number,
  maybeCycleYear?: string | number
) {
  const employeeEmail = resolveUserEmail(employeeEmailOrUser);
  const employeeName = typeof employeeEmailOrUser === "string" ? employeeNameOrGoalTitle : employeeEmailOrUser.name;
  const goalTitle = typeof employeeEmailOrUser === "string" ? String(goalTitleOrCycleYear) : employeeNameOrGoalTitle;
  const cycleYear = String(maybeCycleYear ?? goalTitleOrCycleYear);
  const link = `${portalUrl}/goals`;
  await sendMail(
    employeeEmail,
    "A Departmental Goal Has Been Added to Your Sheet",
    baseTemplate(
      "New Shared Goal Added",
      `<p>Hi ${employeeName},</p>
       <p>The goal <strong>"${goalTitle}"</strong> has been added to your goal sheet for <strong>${cycleYear}</strong> by your admin/manager.</p>
       <p>You can adjust the weightage for this goal, but the title and target are fixed.</p>
       <a href="${link}" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">View My Goals -></a>`
    )
  );
}

export async function sendEscalationEmail(to: string | MailUser, subject: string, bodyText: string) {
  await sendMail(
    resolveUserEmail(to),
    subject,
    baseTemplate(
      subject,
      `<p>${bodyText}</p>
       <a href="${portalUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">Open Portal -></a>`
    )
  );
}

export async function sendGoalSheetUnlockedEmail(employeeEmail: string, employeeName: string) {
  await sendMail(
    employeeEmail,
    "Your goal sheet has been unlocked",
    baseTemplate(
      "Goal Sheet Unlocked",
      `<p>Hi ${employeeName},</p>
       <p>Your goal sheet has been unlocked by admin. You may now edit and resubmit your goals.</p>
       <a href="${portalUrl}/goals" style="display:inline-block;background:#1e40af;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px">Open My Goals -></a>`
    )
  );
}
