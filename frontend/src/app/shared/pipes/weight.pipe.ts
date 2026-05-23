import { Pipe, PipeTransform } from '@angular/core';
import { Weight } from '@core/types/api.types';

const LABELS: Record<Weight, string> = { 1: 'Ligera', 2: 'Media', 3: 'Pesada' };

@Pipe({ name: 'weight', standalone: true, pure: true })
export class WeightPipe implements PipeTransform {
  transform(value: Weight): string {
    return LABELS[value] ?? '';
  }
}
