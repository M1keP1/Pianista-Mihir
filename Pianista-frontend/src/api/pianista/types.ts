export type ResultStatus = "success" | "failure";

export type ConvertResponse = {
  result_status: ResultStatus;
  generated_domain?: string;
  generated_problem?: string;
};

export type ValidateSingleResponse = {
  result: ResultStatus;
  details?: unknown;
};

export type ValidateMatchResponse = {
  result: ResultStatus;
  details?: unknown;
};
