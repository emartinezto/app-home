import { Pipe, PipeTransform } from '@angular/core';
import { relativeFromNow } from '@core/utils/date.util';

@Pipe({ name: 'relativeDate', standalone: true, pure: true })
export class RelativeDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    return relativeFromNow(value);
  }
}
