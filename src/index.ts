import os from "node:os";
import path from "node:path";
import nodemailer from "nodemailer";
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';

export interface CatchOutputOptions {
  mailTo?: string;
  mailFrom?: string;
  mailSubject?: string;
  mailBodyPrefix?: string;
  forceMail?: boolean;
  enable?: boolean;
  passthrough?: boolean;
  smtpConfig?: SMTPTransport.Options;
}

export class CatchOutput {
  private readonly fqdn: string;
  private readonly domain: string;
  private readonly hostname: string;
  private readonly progPath: string;
  private readonly progName: string;
  private readonly progLine: string;

  private readonly mailTo: string;
  private readonly mailFrom: string;
  private readonly mailSubject: string;
  private readonly mailBodyPrefix: string;
  private readonly forceMail: boolean;
  private readonly catchOutput: boolean;
  private readonly passthrough: boolean;
  private readonly smtpConfig: SMTPTransport.Options;

  private stdoutBuffer = '';
  private stderrBuffer = '';

  private readonly origStdoutWrite: typeof process.stdout.write;
  private readonly origStderrWrite: typeof process.stderr.write;

  private isHooked = false;

  constructor(options: CatchOutputOptions = {}) {
    const isInteractive = Boolean(process.stdin.isTTY);
    this.catchOutput = options.enable ?? !isInteractive;
    this.passthrough = options.passthrough ?? false;

    this.fqdn = os.hostname();
    this.domain = this.fqdn.split('.').slice(-2).join('.');
    this.hostname = this.fqdn.split(".")[0];
    this.progPath = process.argv[1] || "node";
    this.progName = path.basename(this.progPath);
    this.progLine = `${process.argv0} ${process.argv.slice(1).join(" ")}`;

    //-------------------------------------------------------------------------
    // Configuration defaults
    //-------------------------------------------------------------------------
    this.mailTo = options.mailTo || `root@${this.domain}`;
    this.mailFrom = options.mailFrom ||
      `"${this.hostname}" <${this.mailTo.split(",")[0].trim()}>`;
    this.mailSubject = options.mailSubject || "#PROGNAME# output";
    this.mailBodyPrefix = options.mailBodyPrefix ||
      `The following output was generated on #HOSTNAME# by "#PROGLINE#"`;
    this.forceMail = options.forceMail || false;
    this.smtpConfig = options.smtpConfig || {
      host: "localhost",
      port: 25,
      tls: {
        //---------------------------------------------------------------------
        // Disable cert validation
        //---------------------------------------------------------------------
        rejectUnauthorized: false,
      },
    };

    //-------------------------------------------------------------------------
    // Buffers
    //-------------------------------------------------------------------------
    this.stdoutBuffer = "";
    this.stderrBuffer = "";

    //-------------------------------------------------------------------------
    // Original streams
    //-------------------------------------------------------------------------
    this.origStdoutWrite = process.stdout.write.bind(process.stdout);
    this.origStderrWrite = process.stderr.write.bind(process.stderr);

    this.isHooked = false;
  }

  //---------------------------------------------------------------------------
  // Prefixing a class method with hash (#) makes it private to the class
  // Replace placeholders like #HOSTNAME#, #PROGNAME#
  //---------------------------------------------------------------------------
  #token(str: string): string {
    return str
      .replace(/#FQDN#/g, this.fqdn)
      .replace(/#DOMAIN#/g, this.domain)
      .replace(/#HOSTNAME#/g, this.hostname)
      .replace(/#PROGNAME#/g, this.progName)
      .replace(/#PROGLINE#/g, this.progLine)
      .replace(/#PROGPATH#/g, this.progPath);
  }

  public start(): void {
    if (!this.catchOutput || this.isHooked) {
      return;
    }
    this.isHooked = true;

    //-------------------------------------------------------------------------
    // Intercept process.stdout
    //-------------------------------------------------------------------------
    process.stdout.write = (
      chunk: string | Uint8Array,
      encoding?: BufferEncoding | ((err?: Error) => void),
      callback?: (err?: Error | null) => void
    ): boolean => {
      this.stdoutBuffer += chunk.toString();

      const enc = typeof encoding === 'string' ? encoding : undefined;
      //const cb = typeof encoding === "function" ? encoding : callback;
      const cb = (typeof encoding === 'function' ? encoding : callback) as
        | ((err?: Error | null) => void)
        | undefined;

      if (this.passthrough) {
        return this.origStdoutWrite(
          chunk,
          enc as BufferEncoding,
          cb,
        );
      }

      if (typeof cb === "function") {
        cb();
      }
      return true;
    };

    //-------------------------------------------------------------------------
    // Intercept process.stderr
    //-------------------------------------------------------------------------
    process.stderr.write = (
      chunk: string | Uint8Array,
      encoding?: BufferEncoding | ((err?: Error) => void),
      callback?: (err?: Error | null) => void
    ): boolean => {
      this.stderrBuffer += chunk.toString();
      const enc = typeof encoding === 'string' ? encoding : undefined;
      //const cb = typeof encoding === "function" ? encoding : callback;
      const cb = (typeof encoding === 'function' ? encoding : callback) as
        | ((err?: Error | null) => void)
        | undefined;

      if (this.passthrough) {
        return this.origStdoutWrite(
          chunk,
          enc as BufferEncoding,
          cb,
        );
      }

      if (typeof cb === "function") {
        cb();
      }
      return true;
    };

    //-------------------------------------------------------------------------
    // Intercept Uncaught Exceptions (die handling)
    //-------------------------------------------------------------------------
    process.on("uncaughtException", (err: Error) => {
      this.stderrBuffer += `\nUncaught Exception:\n${err.stack || err}\n`;
      //-----------------------------------------------------------------------
      // Send email and exit immediately
      //-----------------------------------------------------------------------
      this.flushAndMailSync().finally(() => {
        process.exit(1);
      });
    });

    //-------------------------------------------------------------------------
    // Mimic Perl's END block on normal exit
    //-------------------------------------------------------------------------
    process.on("beforeExit", async () => {
      if (this.isHooked) {
        await this.flushAndMailSync();
        this.stop(); // Avoid duplicate triggers
      }
    });
  }

  public stop() {
    if (!this.isHooked) {
      return;
    }

    process.stdout.write = this.origStdoutWrite;
    process.stderr.write = this.origStderrWrite;

    this.isHooked = false;
  }

  public async flushAndMailSync(): Promise<void> {
    if (!this.stdoutBuffer && !this.stderrBuffer && !this.forceMail) {
      //-----------------------------------------------------------------------
      // Nothing to report
      //-----------------------------------------------------------------------
      return;
    }

    const subject = this.#token(this.mailSubject);
    const to = this.#token(this.mailTo);
    const from = this.#token(this.mailFrom);
    const prefix = this.#token(this.mailBodyPrefix);

    let body = `${prefix}\n\n`;
    if (this.stderrBuffer) {
      body += `STDERR:\n${this.stderrBuffer}\n\n`;
    }
    if (this.stdoutBuffer) {
      body += `STDOUT:\n${this.stdoutBuffer}\n\n`;
    }

    const transporter = nodemailer.createTransport(this.smtpConfig);

    try {
      await transporter.sendMail({
        from,
        to,
        subject,
        text: body,
      });
    } catch (err) {
      //-----------------------------------------------------------------------
      // Fallback to original stderr if mailing fails
      //-----------------------------------------------------------------------
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.origStderrWrite(
        `Failed to send execution log email: ${errorMsg}\n\n`
      );
      this.origStderrWrite(
        `From: ${from}\nTo: ${to}\nSubject: ${subject}\n\n${body}`
      );
    }
  }
}

//-----------------------------------------------------------------------------
// Singleton helper to closely match `use WCS::Catch;` behavior
//-----------------------------------------------------------------------------
export function catchOutput(options: CatchOutputOptions = {}): CatchOutput {
  const catcher = new CatchOutput(options);
  catcher.start();
  return catcher;
}
