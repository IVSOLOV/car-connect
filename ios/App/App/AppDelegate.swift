import UIKit
import Capacitor

#if canImport(FirebaseCore)
import FirebaseCore
#endif

#if canImport(FirebaseMessaging)
import FirebaseMessaging
#endif

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        print("[Push][iOS] AppDelegate didFinishLaunchingWithOptions")

        #if canImport(FirebaseCore)
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
            print("[Push][iOS] FirebaseApp.configure() completed")
        } else {
            print("[Push][iOS] Firebase already configured")
        }
        #else
        print("[Push][iOS] FirebaseCore not linked; APNs-only registration bridge active")
        #endif

        #if canImport(FirebaseMessaging)
        Messaging.messaging().delegate = self
        print("[Push][iOS] Firebase Messaging delegate attached")
        #else
        print("[Push][iOS] FirebaseMessaging not linked; skipping FCM delegate setup")
        #endif

        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let apnsToken = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("[Push][iOS] didRegisterForRemoteNotificationsWithDeviceToken (APNs): \(apnsToken)")

        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
        print("[Push][iOS] Posted .capacitorDidRegisterForRemoteNotifications (APNs token)")

        #if canImport(FirebaseMessaging)
        Messaging.messaging().apnsToken = deviceToken
        print("[Push][iOS] Messaging.messaging().apnsToken assigned")

        Messaging.messaging().token { token, error in
            if let error = error {
                print("[Push][iOS] Firebase token fetch error: \(error.localizedDescription)")
                NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
                return
            }

            guard let token else {
                print("[Push][iOS] Firebase returned nil FCM token")
                return
            }

            print("[Push][iOS] Firebase FCM token received: \(token)")
            NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: token)
            print("[Push][iOS] Posted .capacitorDidRegisterForRemoteNotifications (FCM token)")
        }
        #endif
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[Push][iOS] didFailToRegisterForRemoteNotificationsWithError: \(error.localizedDescription)")
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
        print("[Push][iOS] Posted .capacitorDidFailToRegisterForRemoteNotifications")
    }

    #if canImport(FirebaseMessaging)
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken else {
            print("[Push][iOS] messaging(_:didReceiveRegistrationToken:) -> nil token")
            return
        }

        print("[Push][iOS] messaging(_:didReceiveRegistrationToken:) -> \(fcmToken)")
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: fcmToken)
        print("[Push][iOS] Posted .capacitorDidRegisterForRemoteNotifications from Messaging delegate")
    }
    #endif

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources and save user data.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused while the application was inactive.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate.
    }

    func application(_ app: UIApplication,
                     open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication,
                     continue userActivity: NSUserActivity,
                     restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
