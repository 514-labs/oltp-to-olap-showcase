"""
External Kafka Topics (CDC Events from PostgreSQL)

Redpanda Connect streams CDC events from PostgreSQL to these topics.
Topic: sqlalchemy_cdc_events
"""

from moose_lib import Stream, StreamConfig, LifeCycle, Logger
from pydantic import BaseModel

class SqlAlchemyCdcEvents(BaseModel):
    pass

# External CDC event stream from Redpanda Connect
SqlAlchemyCdcEventsStream = Stream[SqlAlchemyCdcEvents](
    name='sqlalchemy_cdc_events',
    config=StreamConfig(
        life_cycle=LifeCycle.EXTERNALLY_MANAGED
    )
)

