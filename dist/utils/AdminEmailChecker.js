export const getAdminStatus = (email) => {
    if (!email)
        return false;
    const adminEmails = process.env.ADMIN_EMAILS
        ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
        : [];
    return adminEmails.includes(email.toLowerCase());
};
