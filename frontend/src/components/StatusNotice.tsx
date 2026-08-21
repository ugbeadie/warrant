export const StatusNotice = () => (
  <div className="mb-6 rounded-md border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-xs leading-relaxed text-on-dark-muted">
    <p className="font-medium text-amber-200">
      Warrant is offline until 1 September.
    </p>
    <p className="mt-1.5">
      The free-tier database hit its monthly compute limit. A background job was
      sweeping every five minutes against a database that suspends after five
      minutes idle, so it never slept and billed around the clock.
    </p>
    <p className="mt-1.5">
      That's fixed. Expiry now happens when a page reads a grant rather than on
      a schedule, and the sweep only sends notifications, hourly. It comes back
      with the quota and stays up.
    </p>
    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
      <a
        href="https://medium.com/@ugbeadie3/why-i-built-a-system-that-forgets-acab773178c1"
        target="_blank"
        rel="noreferrer"
        className="font-medium text-amber-200 hover:underline"
      >
        Read the write-up
      </a>
      <a
        href="https://www.ugbeadie.com/projects/warrant"
        target="_blank"
        rel="noreferrer"
        className="font-medium text-amber-200 hover:underline"
      >
        Demo video
      </a>
      <a
        href="https://github.com/ugbeadie/warrant"
        target="_blank"
        rel="noreferrer"
        className="font-medium text-amber-200 hover:underline"
      >
        Code on GitHub
      </a>
    </div>
  </div>
);
