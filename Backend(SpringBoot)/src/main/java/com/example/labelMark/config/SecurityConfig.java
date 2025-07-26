package com.example.labelMark.config;

import com.example.labelMark.filter.JwtAuthenticationTokenFilter;
import com.example.labelMark.filter.JwtFilter;
//import com.example.labelMark.handle.FailureHandler;
//import com.example.labelMark.handle.LabelLogoutSuccessHandler;
//import com.example.labelMark.handle.SuccessHandler;
//import com.example.labelMark.handle.UsernamePasswordAuthenticationEntryPoint;
import com.example.labelMark.service.impl.UserDetailsServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.builders.WebSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import javax.servlet.Filter;
import java.util.Arrays;

/**
 * @Description SpringSecurity配置拦截接口，过滤器，解码器

 */
@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {
    @Autowired
    private JwtFilter jwtFilter;
    @Autowired
    JwtAuthenticationTokenFilter jwtAuthenticationTokenFilter;
//    @Autowired
//    UsernamePasswordAuthenticationEntryPoint usernamePasswordAuthenticationEntryPoint;
//    @Autowired
//    SuccessHandler successHandler;
//    @Autowired
//    FailureHandler failureHandler;
//    @Autowired
//    LabelLogoutSuccessHandler labelLogoutSuccessHandler;


    @Autowired
    private UserDetailsServiceImpl userDetailsService;
    @Override
    protected void configure(AuthenticationManagerBuilder auth) throws Exception {
        auth.userDetailsService(userDetailsService)// 设置自定义的userDetailsService
                .passwordEncoder(passwordEncoder());
    }

    @Override
    public void configure(WebSecurity web) throws Exception {
        web.ignoring().antMatchers("/css/**", "/fonts/**", "/images/**", "/js/**", "/dataset_temp/**");
    }

    @Bean
    public PasswordEncoder passwordEncoder(){
        // 使用BCrypt加密密码
        return new BCryptPasswordEncoder();
    }

    //暴露认证接口
    @Override
    @Bean
    public AuthenticationManager authenticationManagerBean() throws Exception {
        return super.authenticationManagerBean();
    }


    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
                .csrf().disable()// 禁用CSRF保护（在实际应用中请根据需要启用）
                //不通过Session获取SecurityContext
                .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                .and()
                .authorizeRequests()
//                .antMatchers("/user/login","/user/checkEmail","/user/register").permitAll() // 不拦截登录接口
                .antMatchers("/admin/**").hasRole("ADMIN")//管理员接口
                // 对于登录接口
                .antMatchers("/user/login", "/user/register").permitAll()
                // 允许访问缩略图接口
                .antMatchers("/dataset/thumbnail").permitAll()
                // 允许访问样本图像预览接口
                .antMatchers("/datasetStore/getSamplePreviewImage").permitAll()
                // 允许访问原始影像预览接口
                .antMatchers("/datasetStore/getSampleOriginalImage").permitAll()
                // 允许访问静态资源
                .antMatchers("/dataset_temp/**").permitAll()
                .antMatchers("/dataset/**").permitAll()
                // 允许WebSocket连接
                .antMatchers("/ws/**").permitAll()
                .antMatchers("/websocket-test/**").permitAll()
                // 允许任务回调接口
                .antMatchers("/task-callback/**").permitAll()
                .antMatchers(
                        "/swagger-ui/**",
                        "/webjars/**",
                        "/swagger-resources/**",
                        "/v2/**",
                        "/doc.html/**",
                        "/favicon.ico",
                        "/v3/**"
                ).permitAll() // 不拦截Swagger接口
                // 除上面外的所有请求全部需要鉴权认证
                .anyRequest().authenticated()
                .and()
                .formLogin().disable(); // 禁用默认的表单登录
        //添加过滤器
        http.addFilterBefore(jwtAuthenticationTokenFilter, UsernamePasswordAuthenticationFilter.class);
////        添加没有许可时的处理器
//        http.exceptionHandling().authenticationEntryPoint(usernamePasswordAuthenticationEntryPoint);
////        添加登录成功的处理器
//        http.formLogin().successHandler(successHandler);
////        添加登录失败的处理器
//        http.formLogin().failureHandler(failureHandler);
//        //配置注销成功处理器
//        http.logout()
//                .logoutSuccessHandler(labelLogoutSuccessHandler);
        // 如果需要允许跨域请求，可以添加如下配置
        http.cors().configurationSource(corsConfigurationSource());

    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(){
        final CorsConfiguration configuration=new CorsConfiguration();

        // 允许来自所有源的请求
        configuration.setAllowedOrigins(Arrays.asList("*"));

        // 允许任何头部
        configuration.setAllowedHeaders(Arrays.asList("*"));

        // 允许任何方法（post、get等）
        configuration.setAllowedMethods(Arrays.asList("GET","POST","PUT","DELETE","OPTIONS"));

        // 设置预检请求的有效期为3600秒
        configuration.setMaxAge(3600L);

        final UrlBasedCorsConfigurationSource source=new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**",configuration);

        return source;
    }

}
