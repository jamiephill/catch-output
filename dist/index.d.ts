import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
export interface CatchOutputOptions {
    mailTo?: string;
    mailFrom?: string;
    mailSubject?: string;
    mailBodyPrefix?: string;
    forceMail?: boolean;
    enable?: boolean;
    smtpConfig?: SMTPTransport.Options;
}
export declare class CatchOutput {
    #private;
    private readonly fqdn;
    private readonly domain;
    private readonly hostname;
    private readonly progPath;
    private readonly progName;
    private readonly progLine;
    private readonly mailTo;
    private readonly mailFrom;
    private readonly mailSubject;
    private readonly mailBodyPrefix;
    private readonly forceMail;
    private readonly catchOutput;
    private readonly smtpConfig;
    private stdoutBuffer;
    private stderrBuffer;
    private readonly origStdoutWrite;
    private readonly origStderrWrite;
    private isHooked;
    constructor(options?: CatchOutputOptions);
    start(): void;
    stop(): void;
    flushAndMailSync(): Promise<void>;
}
export declare function catchOutput(options?: CatchOutputOptions): CatchOutput;
//# sourceMappingURL=index.d.ts.map