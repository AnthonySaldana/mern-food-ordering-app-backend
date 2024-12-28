import type * as types from './types';
import type { ConfigOptions, FetchResponse } from 'api/dist/core'
import Oas from 'oas';
import APICore from 'api/dist/core';
import definition from './openapi.json';

class SDK {
  spec: Oas;
  core: APICore;

  constructor() {
    this.spec = Oas.init(definition);
    this.core = new APICore(this.spec, 'mealmeapi/1.0 (api/6.1.2)');
  }

  /**
   * Optionally configure various options that the SDK allows.
   *
   * @param config Object of supported SDK options and toggles.
   * @param config.timeout Override the default `fetch` request timeout of 30 seconds. This number
   * should be represented in milliseconds.
   */
  config(config: ConfigOptions) {
    this.core.setConfig(config);
  }

  /**
   * If the API you're using requires authentication you can supply the required credentials
   * through this method and the library will magically determine how they should be used
   * within your API request.
   *
   * With the exception of OpenID and MutualTLS, it supports all forms of authentication
   * supported by the OpenAPI specification.
   *
   * @example <caption>HTTP Basic auth</caption>
   * sdk.auth('username', 'password');
   *
   * @example <caption>Bearer tokens (HTTP or OAuth 2)</caption>
   * sdk.auth('myBearerToken');
   *
   * @example <caption>API Keys</caption>
   * sdk.auth('myApiKey');
   *
   * @see {@link https://spec.openapis.org/oas/v3.0.3#fixed-fields-22}
   * @see {@link https://spec.openapis.org/oas/v3.1.0#fixed-fields-22}
   * @param values Your auth credentials for the API; can specify up to two strings or numbers.
   */
  auth(...values: string[] | number[]) {
    this.core.setAuth(...values);
    return this;
  }

  /**
   * If the API you're using offers alternate server URLs, and server variables, you can tell
   * the SDK which one to use with this method. To use it you can supply either one of the
   * server URLs that are contained within the OpenAPI definition (along with any server
   * variables), or you can pass it a fully qualified URL to use (that may or may not exist
   * within the OpenAPI definition).
   *
   * @example <caption>Server URL with server variables</caption>
   * sdk.server('https://{region}.api.example.com/{basePath}', {
   *   name: 'eu',
   *   basePath: 'v14',
   * });
   *
   * @example <caption>Fully qualified server URL</caption>
   * sdk.server('https://eu.api.example.com/v14');
   *
   * @param url Server URL
   * @param variables An object of variables to replace into the server URL.
   */
  server(url: string, variables = {}) {
    this.core.setServer(url, variables);
  }

  /**
   * Search For A Store
   *
   * @throws FetchError<400, types.GetSearchStoreV3Response400> Input Validation Error
   * @throws FetchError<401, types.GetSearchStoreV3Response401> Missing Authorization
   * @throws FetchError<429, types.GetSearchStoreV3Response429> Too Many Requests
   */
  get_search_store_v3(metadata: types.GetSearchStoreV3MetadataParam): Promise<FetchResponse<200, types.GetSearchStoreV3Response200>> {
    return this.core.fetch('/search/store/v3', 'get', metadata);
  }

  /**
   * Search For A Product
   *
   * @throws FetchError<400, types.GetSearchProductV4Response400> Input Validation Error
   * @throws FetchError<401, types.GetSearchProductV4Response401> Missing Authorization
   * @throws FetchError<429, types.GetSearchProductV4Response429> Too Many Requests
   */
  get_search_product_v4(metadata: types.GetSearchProductV4MetadataParam): Promise<FetchResponse<200, types.GetSearchProductV4Response200>> {
    return this.core.fetch('/search/product/v4', 'get', metadata);
  }

  /**
   * Search For A Cart
   *
   * @throws FetchError<400, types.GetSearchCartResponse400> Input Validation Error
   * @throws FetchError<401, types.GetSearchCartResponse401> Missing Authorization
   * @throws FetchError<429, types.GetSearchCartResponse429> Too Many Requests
   */
  get_search_cart(metadata: types.GetSearchCartMetadataParam): Promise<FetchResponse<200, types.GetSearchCartResponse200>> {
    return this.core.fetch('/search/cart', 'get', metadata);
  }

  /**
   * Get Inventory
   *
   * @throws FetchError<400, types.GetInventoryDetailsV3Response400> Input Validation Error
   * @throws FetchError<401, types.GetInventoryDetailsV3Response401> Missing Authorization
   * @throws FetchError<406, types.GetInventoryDetailsV3Response406> Inventory Unavailable
   * @throws FetchError<429, types.GetInventoryDetailsV3Response429> Too Many Requests
   */
  get_inventory_details_v3(metadata: types.GetInventoryDetailsV3MetadataParam): Promise<FetchResponse<200, types.GetInventoryDetailsV3Response200>> {
    return this.core.fetch('/details/inventory/v3', 'get', metadata);
  }

  /**
   * Get Product Details
   *
   * @throws FetchError<400, types.GetProductDetailsV2Response400> Input Validation Error
   * @throws FetchError<401, types.GetProductDetailsV2Response401> Missing Authorization
   * @throws FetchError<406, types.GetProductDetailsV2Response406> Product Details Unavailable
   * @throws FetchError<429, types.GetProductDetailsV2Response429> Too Many Requests
   */
  get_product_details_v2(metadata: types.GetProductDetailsV2MetadataParam): Promise<FetchResponse<200, types.GetProductDetailsV2Response200>> {
    return this.core.fetch('/details/product/v2', 'get', metadata);
  }

  /**
   * Create Payment Method
   *
   * @throws FetchError<400, types.PostPaymentCreateV2Response400> Input Validation Error
   * @throws FetchError<401, types.PostPaymentCreateV2Response401> Missing Authorization
   * @throws FetchError<422, types.PostPaymentCreateV2Response422> User id does not match user email
   * @throws FetchError<429, types.PostPaymentCreateV2Response429> Too Many Requests
   */
  post_payment_create_v2(body: types.PostPaymentCreateV2BodyParam): Promise<FetchResponse<200, types.PostPaymentCreateV2Response200>> {
    return this.core.fetch('/payment/create/v2', 'post', body);
  }

  /**
   * List Payment Methods
   *
   * @throws FetchError<400, types.GetPaymentListResponse400> Input Validation Error
   * @throws FetchError<401, types.GetPaymentListResponse401> Missing Authorization
   * @throws FetchError<429, types.GetPaymentListResponse429> Too Many Requests
   */
  get_payment_list(metadata: types.GetPaymentListMetadataParam): Promise<FetchResponse<200, types.GetPaymentListResponse200>> {
    return this.core.fetch('/payment/list', 'get', metadata);
  }

  /**
   * Delete Payment Method
   *
   * @throws FetchError<400, types.PostPaymentDeleteResponse400> Input Validation Error
   * @throws FetchError<401, types.PostPaymentDeleteResponse401> Missing Authorization
   * @throws FetchError<422, types.PostPaymentDeleteResponse422> User id does not match user email
   * @throws FetchError<429, types.PostPaymentDeleteResponse429> Too Many Requests
   */
  post_payment_delete(body: types.PostPaymentDeleteBodyParam): Promise<FetchResponse<200, types.PostPaymentDeleteResponse200>> {
    return this.core.fetch('/payment/delete', 'post', body);
  }

  /**
   * Get Payment Intent
   *
   * @throws FetchError<400, types.PostGetPaymentIntentResponse400> Input Validation Error
   * @throws FetchError<401, types.PostGetPaymentIntentResponse401> Missing Authorization
   * @throws FetchError<406, types.PostGetPaymentIntentResponse406> Quote Unavailable
   * @throws FetchError<420, types.PostGetPaymentIntentResponse420> Product Unavailable
   * @throws FetchError<422, types.PostGetPaymentIntentResponse422> Checkout Error
   */
  post_get_payment_intent(body: types.PostGetPaymentIntentBodyParam): Promise<FetchResponse<200, types.PostGetPaymentIntentResponse200>> {
    return this.core.fetch('/payment/get_payment_intent', 'post', body);
  }

  /**
   * Create Order
   *
   * @throws FetchError<400, types.PostOrderV3Response400> Input Validation Error
   * @throws FetchError<401, types.PostOrderV3Response401> Missing Authorization
   * @throws FetchError<406, types.PostOrderV3Response406> Quote Unavailable
   * @throws FetchError<420, types.PostOrderV3Response420> Product Unavailable
   * @throws FetchError<422, types.PostOrderV3Response422> Checkout Error
   * @throws FetchError<504, types.PostOrderV3Response504> Gateway Timeout
   */
  post_order_v3(body: types.PostOrderV3BodyParam): Promise<FetchResponse<200, types.PostOrderV3Response200> | FetchResponse<202, types.PostOrderV3Response202>> {
    return this.core.fetch('/order/order/v3', 'post', body);
  }

  /**
   * Finalize Order
   *
   * @throws FetchError<400, types.PostConfirmOrderResponse400> Input Validation Error
   * @throws FetchError<401, types.PostConfirmOrderResponse401> Missing Authorization
   * @throws FetchError<422, types.PostConfirmOrderResponse422> Checkout Error
   * @throws FetchError<504, types.PostConfirmOrderResponse504> Gateway Timeout
   */
  post_confirm_order(body: types.PostConfirmOrderBodyParam): Promise<FetchResponse<200, types.PostConfirmOrderResponse200>> {
    return this.core.fetch('/order/finalize', 'post', body);
  }

  /**
   * Create Cart
   *
   * @throws FetchError<400, types.PostCreateCartResponse400> Input Validation Error
   * @throws FetchError<401, types.PostCreateCartResponse401> Missing Authorization
   * @throws FetchError<422, types.PostCreateCartResponse422> Checkout Error
   * @throws FetchError<429, types.PostCreateCartResponse429> Too Many Requests
   */
  post_create_cart(body: types.PostCreateCartBodyParam): Promise<FetchResponse<200, types.PostCreateCartResponse200>> {
    return this.core.fetch('/cart/create', 'post', body);
  }

  /**
   * Add to Cart
   *
   * @throws FetchError<400, types.PostAddToCartResponse400> Input Validation Error
   * @throws FetchError<401, types.PostAddToCartResponse401> Missing Authorization
   * @throws FetchError<422, types.PostAddToCartResponse422> Checkout Error
   * @throws FetchError<429, types.PostAddToCartResponse429> Too Many Requests
   */
  post_add_to_cart(body: types.PostAddToCartBodyParam): Promise<FetchResponse<200, types.PostAddToCartResponse200>> {
    return this.core.fetch('/cart/add', 'post', body);
  }

  /**
   * Remove from Cart
   *
   * @throws FetchError<400, types.PostRemoveFromCartResponse400> Input Validation Error
   * @throws FetchError<401, types.PostRemoveFromCartResponse401> Missing Authorization
   * @throws FetchError<429, types.PostRemoveFromCartResponse429> Too Many Requests
   */
  post_remove_from_cart(body: types.PostRemoveFromCartBodyParam): Promise<FetchResponse<200, types.PostRemoveFromCartResponse200>> {
    return this.core.fetch('/cart/remove', 'post', body);
  }

  /**
   * Retrieve Cart
   *
   * @throws FetchError<400, types.GetRetrieveCartResponse400> Input Validation Error
   * @throws FetchError<401, types.GetRetrieveCartResponse401> Missing Authorization
   * @throws FetchError<429, types.GetRetrieveCartResponse429> Too Many Requests
   */
  get_retrieve_cart(metadata: types.GetRetrieveCartMetadataParam): Promise<FetchResponse<200, types.GetRetrieveCartResponse200>> {
    return this.core.fetch('/cart/retrieve', 'get', metadata);
  }

  /**
   * List Carts
   *
   * @throws FetchError<400, types.GetListCartsResponse400> Input Validation Error
   * @throws FetchError<401, types.GetListCartsResponse401> Missing Authorization
   * @throws FetchError<429, types.GetListCartsResponse429> Too Many Requests
   */
  get_list_carts(metadata: types.GetListCartsMetadataParam): Promise<FetchResponse<200, types.GetListCartsResponse200>> {
    return this.core.fetch('/cart/list', 'get', metadata);
  }

  /**
   * Geocode
   *
   * @throws FetchError<400, types.PostGeocodeAddressV2Response400> Input Validation Error
   * @throws FetchError<401, types.PostGeocodeAddressV2Response401> Missing Authorization
   * @throws FetchError<429, types.PostGeocodeAddressV2Response429> Too Many Requests
   */
  post_geocode_address_v2(body: types.PostGeocodeAddressV2BodyParam): Promise<FetchResponse<200, types.PostGeocodeAddressV2Response200>> {
    return this.core.fetch('/location/geocode/v2', 'post', body);
  }

  /**
   * Reverse Geocode
   *
   * @throws FetchError<400, types.PostReverseGeocodeAddressV2Response400> Input Validation Error
   * @throws FetchError<401, types.PostReverseGeocodeAddressV2Response401> Missing Authorization
   * @throws FetchError<429, types.PostReverseGeocodeAddressV2Response429> Too Many Requests
   */
  post_reverse_geocode_address_v2(body: types.PostReverseGeocodeAddressV2BodyParam): Promise<FetchResponse<200, types.PostReverseGeocodeAddressV2Response200>> {
    return this.core.fetch('/location/reverse_geocode/v2', 'post', body);
  }

  /**
   * Search For A Place
   *
   * @throws FetchError<400, types.GetPlacesSearchResponse400> Input Validation Error
   * @throws FetchError<401, types.GetPlacesSearchResponse401> Missing Authorization
   * @throws FetchError<429, types.GetPlacesSearchResponse429> Too Many Requests
   */
  get_places_search(metadata: types.GetPlacesSearchMetadataParam): Promise<FetchResponse<200, types.GetPlacesSearchResponse200>> {
    return this.core.fetch('/places/search', 'get', metadata);
  }

  /**
   * Add Google Place to MealMe
   *
   * @throws FetchError<400, types.GetUtilsAddStoreResponse400> Input Validation Error
   * @throws FetchError<401, types.GetUtilsAddStoreResponse401> Missing Authorization
   * @throws FetchError<404, types.GetUtilsAddStoreResponse404> Google Place ID Error
   * @throws FetchError<429, types.GetUtilsAddStoreResponse429> Too Many Requests
   */
  get_utils_add_store(metadata?: types.GetUtilsAddStoreMetadataParam): Promise<FetchResponse<200, types.GetUtilsAddStoreResponse200>> {
    return this.core.fetch('/utils/add_store', 'get', metadata);
  }

  /**
   * Get MealMe Store
   *
   * @throws FetchError<400, types.GetStoreLookupV2Response400> Input Validation Error
   * @throws FetchError<401, types.GetStoreLookupV2Response401> Missing Authorization
   * @throws FetchError<429, types.GetStoreLookupV2Response429> Too Many Requests
   */
  get_store_lookup_v2(metadata: types.GetStoreLookupV2MetadataParam): Promise<FetchResponse<200, types.GetStoreLookupV2Response200>> {
    return this.core.fetch('/utils/store_lookup/v3', 'get', metadata);
  }

  /**
   * Initiate Customer Support Chat
   *
   * @throws FetchError<400, types.PostChatInitiateResponse400> Input Validation Error
   * @throws FetchError<401, types.PostChatInitiateResponse401> Missing Authorization
   * @throws FetchError<429, types.PostChatInitiateResponse429> Too Many Requests
   */
  post_chat_initiate(body: types.PostChatInitiateBodyParam): Promise<FetchResponse<200, types.PostChatInitiateResponse200>> {
    return this.core.fetch('/customer/service/initiate_chat', 'post', body);
  }

  /**
   * Send Customer Support Chat Message
   *
   * @throws FetchError<400, types.PostSendMessageResponse400> Input Validation Error
   * @throws FetchError<401, types.PostSendMessageResponse401> Missing Authorization
   * @throws FetchError<429, types.PostSendMessageResponse429> Too Many Requests
   */
  post_send_message(body: types.PostSendMessageBodyParam): Promise<FetchResponse<200, types.PostSendMessageResponse200>> {
    return this.core.fetch('/customer/service/send_message', 'post', body);
  }

  /**
   * Read Customer Chat Messages
   *
   * @throws FetchError<400, types.PostReadMessageResponse400> Input Validation Error
   * @throws FetchError<401, types.PostReadMessageResponse401> Missing Authorization
   * @throws FetchError<429, types.PostReadMessageResponse429> Too Many Requests
   */
  post_read_message(body: types.PostReadMessageBodyParam): Promise<FetchResponse<200, types.PostReadMessageResponse200>> {
    return this.core.fetch('/customer/service/read_messages', 'post', body);
  }

  /**
   * Exit Customer Support Chat
   *
   * @throws FetchError<400, types.PostExitChatResponse400> Input Validation Error
   * @throws FetchError<401, types.PostExitChatResponse401> Missing Authorization
   * @throws FetchError<429, types.PostExitChatResponse429> Too Many Requests
   */
  post_exit_chat(body: types.PostExitChatBodyParam): Promise<FetchResponse<200, types.PostExitChatResponse200>> {
    return this.core.fetch('/customer/service/exit_chat', 'post', body);
  }

  /**
   * Fetch Customer Support Chat IDs
   *
   * @throws FetchError<400, types.PostFetchChatIdsResponse400> Input Validation Error
   * @throws FetchError<401, types.PostFetchChatIdsResponse401> Missing Authorization
   * @throws FetchError<429, types.PostFetchChatIdsResponse429> Too Many Requests
   */
  post_fetch_chat_ids(body: types.PostFetchChatIdsBodyParam): Promise<FetchResponse<200, types.PostFetchChatIdsResponse200>> {
    return this.core.fetch('/customer/service/fetch_chat_ids', 'post', body);
  }

  /**
   * Get Orders
   *
   * @throws FetchError<400, types.GetAccountOrdersResponse400> Input Validation Error
   * @throws FetchError<401, types.GetAccountOrdersResponse401> Missing Authorization
   * @throws FetchError<429, types.GetAccountOrdersResponse429> Too Many Requests
   */
  get_account_orders(metadata?: types.GetAccountOrdersMetadataParam): Promise<FetchResponse<200, types.GetAccountOrdersResponse200>> {
    return this.core.fetch('/account/orders', 'get', metadata);
  }

  /**
   * Add Tracking Webhook
   *
   * @throws FetchError<400, types.PostAccountTrackingAddWebhookResponse400> Input Validation Error
   * @throws FetchError<401, types.PostAccountTrackingAddWebhookResponse401> Missing Authorization
   */
  post_account_tracking_add_webhook(body: types.PostAccountTrackingAddWebhookBodyParam): Promise<FetchResponse<200, types.PostAccountTrackingAddWebhookResponse200>> {
    return this.core.fetch('/account/tracking/add_webhook', 'post', body);
  }
}

const createSDK = (() => { return new SDK(); })()
;

export default createSDK;

export type { GetAccountOrdersMetadataParam, GetAccountOrdersResponse200, GetAccountOrdersResponse400, GetAccountOrdersResponse401, GetAccountOrdersResponse429, GetInventoryDetailsV3MetadataParam, GetInventoryDetailsV3Response200, GetInventoryDetailsV3Response400, GetInventoryDetailsV3Response401, GetInventoryDetailsV3Response406, GetInventoryDetailsV3Response429, GetListCartsMetadataParam, GetListCartsResponse200, GetListCartsResponse400, GetListCartsResponse401, GetListCartsResponse429, GetPaymentListMetadataParam, GetPaymentListResponse200, GetPaymentListResponse400, GetPaymentListResponse401, GetPaymentListResponse429, GetPlacesSearchMetadataParam, GetPlacesSearchResponse200, GetPlacesSearchResponse400, GetPlacesSearchResponse401, GetPlacesSearchResponse429, GetProductDetailsV2MetadataParam, GetProductDetailsV2Response200, GetProductDetailsV2Response400, GetProductDetailsV2Response401, GetProductDetailsV2Response406, GetProductDetailsV2Response429, GetRetrieveCartMetadataParam, GetRetrieveCartResponse200, GetRetrieveCartResponse400, GetRetrieveCartResponse401, GetRetrieveCartResponse429, GetSearchCartMetadataParam, GetSearchCartResponse200, GetSearchCartResponse400, GetSearchCartResponse401, GetSearchCartResponse429, GetSearchProductV4MetadataParam, GetSearchProductV4Response200, GetSearchProductV4Response400, GetSearchProductV4Response401, GetSearchProductV4Response429, GetSearchStoreV3MetadataParam, GetSearchStoreV3Response200, GetSearchStoreV3Response400, GetSearchStoreV3Response401, GetSearchStoreV3Response429, GetStoreLookupV2MetadataParam, GetStoreLookupV2Response200, GetStoreLookupV2Response400, GetStoreLookupV2Response401, GetStoreLookupV2Response429, GetUtilsAddStoreMetadataParam, GetUtilsAddStoreResponse200, GetUtilsAddStoreResponse400, GetUtilsAddStoreResponse401, GetUtilsAddStoreResponse404, GetUtilsAddStoreResponse429, PostAccountTrackingAddWebhookBodyParam, PostAccountTrackingAddWebhookResponse200, PostAccountTrackingAddWebhookResponse400, PostAccountTrackingAddWebhookResponse401, PostAddToCartBodyParam, PostAddToCartResponse200, PostAddToCartResponse400, PostAddToCartResponse401, PostAddToCartResponse422, PostAddToCartResponse429, PostChatInitiateBodyParam, PostChatInitiateResponse200, PostChatInitiateResponse400, PostChatInitiateResponse401, PostChatInitiateResponse429, PostConfirmOrderBodyParam, PostConfirmOrderResponse200, PostConfirmOrderResponse400, PostConfirmOrderResponse401, PostConfirmOrderResponse422, PostConfirmOrderResponse504, PostCreateCartBodyParam, PostCreateCartResponse200, PostCreateCartResponse400, PostCreateCartResponse401, PostCreateCartResponse422, PostCreateCartResponse429, PostExitChatBodyParam, PostExitChatResponse200, PostExitChatResponse400, PostExitChatResponse401, PostExitChatResponse429, PostFetchChatIdsBodyParam, PostFetchChatIdsResponse200, PostFetchChatIdsResponse400, PostFetchChatIdsResponse401, PostFetchChatIdsResponse429, PostGeocodeAddressV2BodyParam, PostGeocodeAddressV2Response200, PostGeocodeAddressV2Response400, PostGeocodeAddressV2Response401, PostGeocodeAddressV2Response429, PostGetPaymentIntentBodyParam, PostGetPaymentIntentResponse200, PostGetPaymentIntentResponse400, PostGetPaymentIntentResponse401, PostGetPaymentIntentResponse406, PostGetPaymentIntentResponse420, PostGetPaymentIntentResponse422, PostOrderV3BodyParam, PostOrderV3Response200, PostOrderV3Response202, PostOrderV3Response400, PostOrderV3Response401, PostOrderV3Response406, PostOrderV3Response420, PostOrderV3Response422, PostOrderV3Response504, PostPaymentCreateV2BodyParam, PostPaymentCreateV2Response200, PostPaymentCreateV2Response400, PostPaymentCreateV2Response401, PostPaymentCreateV2Response422, PostPaymentCreateV2Response429, PostPaymentDeleteBodyParam, PostPaymentDeleteResponse200, PostPaymentDeleteResponse400, PostPaymentDeleteResponse401, PostPaymentDeleteResponse422, PostPaymentDeleteResponse429, PostReadMessageBodyParam, PostReadMessageResponse200, PostReadMessageResponse400, PostReadMessageResponse401, PostReadMessageResponse429, PostRemoveFromCartBodyParam, PostRemoveFromCartResponse200, PostRemoveFromCartResponse400, PostRemoveFromCartResponse401, PostRemoveFromCartResponse429, PostReverseGeocodeAddressV2BodyParam, PostReverseGeocodeAddressV2Response200, PostReverseGeocodeAddressV2Response400, PostReverseGeocodeAddressV2Response401, PostReverseGeocodeAddressV2Response429, PostSendMessageBodyParam, PostSendMessageResponse200, PostSendMessageResponse400, PostSendMessageResponse401, PostSendMessageResponse429 } from './types';
