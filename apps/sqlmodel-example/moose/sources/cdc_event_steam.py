from moose.models.models import RawCdcPayload
from moose_lib import Stream, DeadLetterQueue

CdcEventStream = Stream[RawCdcPayload](
    name='sqlmodel_cdc_events'
)

UnknownEventDeadLetterTopic = DeadLetterQueue[RawCdcPayload](
    name='unknown_event_dead_letter'
)