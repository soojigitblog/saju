declare module "lunar-javascript" {
  export class Solar {
    static fromYmdHms(
      y: number,
      m: number,
      d: number,
      hour: number,
      minute: number,
      second: number
    ): Solar;
    getLunar(): {
      getEightChar(): {
        getYear(): string;
        getMonth(): string;
        getDay(): string;
        getTime(): string;
      };
    };
  }
}
