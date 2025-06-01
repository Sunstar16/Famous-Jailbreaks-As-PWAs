(function () {
	if (window.location.href.indexOf("signin") > -1) {
		var token = window.localStorage.getItem('token')
    	if (token) { checkRedirect() }
	
		$("#signin_form").on("submit", function(e){
			e.preventDefault();
			if ($(".g-recaptcha")[0]){
				if(grecaptcha.getResponse().length == 0){
					console.log(grecaptcha.getResponse());
					var err = '<span class="s_text s_text_error"><i class="fas fa-exclamation-triangle mr-2"></i>Captcha is Required</span>';
				
					$(".signin-form .errordiv").html(err);
					$(".errordiv").show();
					return;
				}
			}
			$(".signin_btn").addClass("loading");
			$(".errordiv").hide();
			$(".errordiv").html("");
			$(".locked_errordiv").hide();
			$(".locked_errordiv").html("");
			var email = $("#i_email").val();
			var pass = $("#i_pass").val();
			
			var processing = false; 
			var authenticated = false;
			var url = "https://api.castr.com/users/login";
			var payload = { email: email, password: pass, keepAlive: false };
			$.ajax({
				type: "POST",
				dataType: "json",
				url: url,
				data: payload,
				success: function (res) {
						var user = res.user;
						var authKey = res.authKey;
						window.authenticated = true;
						setSession(user, authKey); 
						$(".signin_btn").removeClass("loading");
						setTimeout(checkRedirect);
					},
				error : function(jqXHR, textStatus, errorThrown){
					$(".signin_btn").removeClass("loading");
					var error = jqXHR.responseText;
					console.log(jqXHR);
					try {
						error = JSON.parse(error);
						console.log(error);
						console.log(error['statusCode'] == 403);
						if(error['statusCode'] == 403){
							$(".locked_errordiv").show();
							$(".locked_errordiv").html('<i class="fas fa-exclamation-triangle" aria-hidden="true"></i>'+error['message']);
						}else{
							$(".errordiv").show();
							$(".errordiv").html('<i class="fa fa-info-circle" aria-hidden="true"></i>'+error['message']+'<br><span>Please try again</span>');
						}
					} catch (e) {
						$(".errordiv").show();
						$(".errordiv").html('<i class="fa fa-info-circle" aria-hidden="true"></i><span>Something went wrong. Please try again</span>');
						return false;
					}
					
				}
			});
		});
		var user = '';
		var auth = '';
		$('.ip--res__contiue').on('click', function(){
			console.log(window.auth);
			console.log(window.user);
	
            
			$.ajax({
				type: "POST",
				url: url,
				headers: {"auth-token": window.auth},
				success: function (res) {
					if(res.success){
						setSession(window.user, window.auth); 
						$(".signin_btn").removeClass("loading");
						setTimeout(checkRedirect(true));
						// console.log('========Go======');
						$('.modal__box--ip').removeClass('show-modal');
					}
					
					},
				error : function(jqXHR, textStatus, errorThrown){
					var error = jqXHR.responseText;
					// console.log('=====stop=====');
					// console.log(jqXHR);
					$(".signin_btn").removeClass("loading");
					destroySession();
				}
			});
		});
		$('.ip--res__cancel').on('click', function(){
					// console.log('=====stop=====');
					destroySession();
					$('.modal__box--ip').removeClass('show-modal');
					$(".signin_btn").removeClass("loading");
		});
		$("#signin_form_master").on("submit", function(e){
			e.preventDefault();
			$(".signin_btn").addClass("loading");
			$(".errordiv").hide();
			$(".errordiv").html("");
			var email = $("#i_email").val();
			var pass = $("#i_pass").val();
			var processing = false; 
			var authenticated = false;
			var url = "https://api.castr.com/admin/login";
			var payload = { email: email, password: pass, keepAlive: false };
			$.ajax({
				type: "POST",
				dataType: "json",
				url: url,
				data: payload,
				success: function (res) {
						var user = res.user;
						var authKey = res.authKey;
						window.authenticated = true;
						setSession(user, authKey); 
						$(".signin_btn").removeClass("loading");
						setTimeout(checkRedirect);
					},
				error : function(jqXHR, textStatus, errorThrown){
					$(".signin_btn").removeClass("loading");
					var error = jqXHR.responseText;
					try {
						error = JSON.parse(error);
						$(".errordiv").show();
						$(".errordiv").html('<i class="fa fa-info-circle" aria-hidden="true"></i>'+error['message']+'<br><span>Please try again</span>');
					} catch (e) {
						$(".errordiv").show();
						$(".errordiv").html('<i class="fa fa-info-circle" aria-hidden="true"></i><span>Something went wrong. Please try again</span>');
						return false;
					}
				}
			});
		});
		
		
		// $(document).on("click", ".signin_btn", function(){
		// 	if ($(".g-recaptcha")[0]){
		// 		if(grecaptcha.getResponse().length == 0){
		// 			var err = '<span class="s_text s_text_error"><i class="fas fa-exclamation-triangle mr-2"></i>Captcha is Required</span>';
		// 			$(".signin-form .errordiv").html(err);
		// 		}
		// 	}
		// });
	 function setSession(user, token) {
        window.localStorage.setItem('user', JSON.stringify(user))
        window.localStorage.setItem('token', token)
    }

	 function destroySession() {
		window.localStorage.removeItem('user');
		window.localStorage.removeItem('token');
    }

    function checkRedirect(multisession = null) {
        var redirectPath = "dashboard"; 
		if(multisession){
			var qs = "?1=1&os=true&"; 
		}else{
			var qs = "?1=1&"; 
		}
		var search = window.location.search; var searchParams = {}; 
		if (search) {
            _.each(search.split("&"), function (chunk) {
                var pars = chunk.split("="); 
				var key = pars[0]
                var value = pars[1]
                key = key.replace(/^\?/g, ""); if (key === "continue") { searchParams[key] = value; } else if (/^_/g.test(key)) {
                    key = key.replace(/^_/g, '')
                    qs += key + '=' + value + '&'
                }
				if(key == 'join'){
                    searchParams[key] = value; 
                }
            }.bind(this));
        }
 		redirectPath = searchParams.continue || redirectPath; 
		qs = qs.replace(/(\?|\&)$/gi, '');
		if(searchParams.join){
            redirectPath+='?teamID='+searchParams.join.replace(/(\?|\&)$/gi, '');
            qs='';
        }
        setTimeout(function () { var redirectUrl = window.location.origin + "/app/" + redirectPath + qs; window.location.href = redirectUrl }.bind(this), 1000);
    }
	}

})()