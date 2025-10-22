/**
 * External Kafka Topics (CDC Events from PostgreSQL)
 */

import { ExternalStream } from '@514labs/moose-lib';
import { RedpandaPgCdcPayload } from '../models';

/**
 * Redpanda Connect streams CDC events from PostgreSQL to this topic
 * Topic: sqlalchemy_cdc_events
 */
export const SqlAlchemyCdcEventsStream = new ExternalStream<RedpandaPgCdcPayload<any>>(
  'sqlalchemy_cdc_events',
  {
    sourceTopic: 'sqlalchemy_cdc_events',
  }
);
