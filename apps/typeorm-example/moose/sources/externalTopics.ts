// AUTO-GENERATED FILE. DO NOT EDIT.
// This file will be replaced when you run `moose kafka pull`.

import { Stream, LifeCycle } from '@514labs/moose-lib';

export const TypeormPublicNullStream = new Stream<{}>('typeorm.public.null', {
  lifeCycle: LifeCycle.EXTERNALLY_MANAGED,
});
export const TypeormCdcEventsStream = new Stream<{}>('typeorm_cdc_events', {
  lifeCycle: LifeCycle.EXTERNALLY_MANAGED,
});
