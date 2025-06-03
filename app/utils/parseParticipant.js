import qrcode from "qrcode";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import localeData from "dayjs/plugin/localeData.js";
import duration from "dayjs/plugin/duration.js";
import utc from "dayjs/plugin/utc.js";
import "dayjs/locale/tr.js";
import "dayjs/locale/en.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localeData);
dayjs.extend(duration);

const defaultTimeZone = "Europe/Istanbul";
const getLocalDateFormat = () => {
	const now = new Date(2013, 11, 31);
	let str = now.toLocaleDateString();
	str = str.replace("31", "DD");
	str = str.replace("12", "MM");
	str = str.replace("2013", "YYYY");
	return str;
};

const getFormattedDate = (date, dateFormat, timeZone = defaultTimeZone) => {
	const format = dateFormat ?? getLocalDateFormat() ?? "DD/MM/YYYY";

	return dayjs(date).tz(timeZone).format(format);
};

const parseDynamicVariable = (questionId, participant) => {
	const answerValue = participant.answers
		?.filter((a) => Boolean(a.question))
		.find((answer) => answer.question.id === questionId)?.value;
	return answerValue ?? "";
};

const parseParticipantVariable = async (variable, participant, timeInfo) => {
	switch (variable) {
		case "participant.fullName":
			return `${participant.name} ${participant.surname}`;
		case "participant.name":
			return participant.name;
		case "participant.surname":
			return participant.surname;
		case "participant.tagGroup":
			return participant?.tags?.[0]?.group?.name ?? "";
		case "participant.dayRestriction":
			return (
				participant?.tags
					?.filter((t) => Boolean(t.activeDate))
					?.map((t) =>
						getFormattedDate(
							t.activeDate,
							timeInfo?.dateFormat,
							timeInfo?.timeZone
						)
					)
					?.join(", ") ?? ""
			);
		case "participant.QR":
			return await qrcode.toDataURL(participant.participantNo);
		default:
			return parseDynamicVariable(variable, participant);
	}
};

export default parseParticipantVariable;
