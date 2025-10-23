"""
External Kafka Topics (CDC Events from PostgreSQL)

Redpanda Connect streams CDC events from PostgreSQL to these topics.
Topic: sqlalchemy_cdc_events
"""

from moose_lib import Stream, LifeCycle
from app.models import RedpandaPgCdcPayload


# External CDC event stream from Redpanda Connect
SqlAlchemyCdcEventsStream = Stream[RedpandaPgCdcPayload](
    name='sqlalchemy_cdc_events',
    lifecycle=LifeCycle.EXTERNALLY_MANAGED
)